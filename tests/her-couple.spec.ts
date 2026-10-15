import {postDraftReset} from './helpers/herDraftBaseline';
import { expect, test, type Page } from '@playwright/test';
test.beforeEach(async({page})=>postDraftReset(page));
import { herCoupleKey } from '../src/experiences/herCouple/repository';
import { herQuizKey } from '../src/experiences/herCompatibility/repository';
import { herUniverseKey } from '../src/experiences/herUniverse/progress';
test.use({hasTouch:true});
const modal=(page:Page)=>page.getByRole('dialog',{name:'Quanto Você Me Conhece?',exact:true});
async function enter(page:Page,count=0,introSeen=true){
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(({universeKey,coupleKey,compatibilityKey,count,introSeen})=>{
    if(!localStorage.getItem(universeKey))localStorage.setItem(universeKey,JSON.stringify({version:1,accepted:true,created:true,stage:'ready',colors:['roxo','dourado']}));
    if(!localStorage.getItem(coupleKey))localStorage.setItem(coupleKey,JSON.stringify({version:1,status:'draft',introSeen,questions:Array.from({length:count},(_,index)=>({id:`couple-${index}`,text:`Pergunta ${index+1}`,comment:index===0?'Explicação guardada.':'',options:Array.from({length:4},(_,option)=>({id:`couple-${index}-${option}`,text:`Resposta ${option+1} da pergunta ${index+1}`,correct:option===0||option===2}))}))}));
    if(!localStorage.getItem(compatibilityKey))localStorage.setItem(compatibilityKey,JSON.stringify({version:1,status:'draft',introSeen:true,questions:[]}));
  },{universeKey:herUniverseKey,coupleKey:herCoupleKey,compatibilityKey:herQuizKey,count,introSeen});
  await page.goto('/universo-dela');await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toBeVisible();
  const access=page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true});await access.focus();await page.keyboard.press('Enter');await expect(modal(page)).toBeVisible();
}
async function fill(page:Page,index:number){
  const editor=modal(page);await editor.getByRole('textbox',{name:'Enunciado',exact:true}).fill(`Pergunta ${index}`);
  for(let option=1;option<=4;option++)await editor.getByRole('textbox',{name:`Texto da alternativa ${option}`,exact:true}).fill(`Resposta ${option} da pergunta ${index}`);
  await editor.getByRole('checkbox',{name:'Alternativa 1 correta',exact:true}).check();await editor.getByRole('checkbox',{name:'Alternativa 3 correta',exact:true}).check();
}
for(const width of [320,390,430,1440])test(`create, single-answer preview, complete and reload at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await enter(page);
  const editor=modal(page),before=await page.evaluate(key=>localStorage.getItem(key),herQuizKey);
  for(let question=1;question<=5;question++){
    await editor.getByRole('button',{name:'Nova pergunta',exact:true}).tap();await fill(page,question);
    await expect(editor.getByRole('textbox',{name:/Texto da alternativa/})).toHaveCount(4);
    if(question<5)await expect(editor.getByRole('button',{name:'Concluir quiz',exact:true})).toBeDisabled();
    if(question===1)await editor.getByRole('textbox',{name:'Comentário explicativo (opcional)',exact:true}).fill('Explicação guardada.');
  }
  await editor.getByRole('button',{name:'Salvar rascunho',exact:true}).tap();await editor.getByRole('button',{name:'Prévia como participante',exact:true}).tap();
  for(let question=1;question<=5;question++){
    await expect(editor.getByText('Explicação guardada.',{exact:true})).toHaveCount(0);await expect(editor.getByText(/Respostas corretas:/)).toHaveCount(0);
    const first=editor.getByRole('radio',{name:`Resposta 1 da pergunta ${question}`,exact:true});await first.focus();await page.keyboard.press('Space');
    if(question!==1)await editor.getByRole('radio',{name:`Resposta 3 da pergunta ${question}`,exact:true}).check();
    if(question===2)await editor.getByRole('radio',{name:'Resposta 4 da pergunta 2',exact:true}).check();
    await expect(editor.getByRole('button',{name:question===5?'Ver resultado':'Próxima pergunta',exact:true})).toBeDisabled();
    await editor.getByRole('button',{name:'Confirmar resposta',exact:true}).tap();await expect(first).toBeDisabled();
    await expect(editor.getByText(question===2?'Resposta incorreta.':'Resposta correta.',{exact:true})).toBeVisible();
    if(question===1)await expect(editor.getByText('Explicação guardada.',{exact:true})).toBeVisible();
    if(question===2){await editor.getByRole('button',{name:'Pergunta anterior',exact:true}).tap();await expect(editor.getByRole('radio',{name:'Resposta 1 da pergunta 1',exact:true})).toBeChecked();await editor.getByRole('button',{name:'Próxima pergunta',exact:true}).tap();}
    await editor.getByRole('button',{name:question===5?'Ver resultado':'Próxima pergunta',exact:true}).tap();
  }
  await expect(editor.getByRole('heading',{name:'Você me conhece: 80%',exact:true})).toBeVisible();
  await editor.getByRole('button',{name:'Voltar ao editor',exact:true}).tap();await editor.getByRole('button',{name:'Concluir quiz',exact:true}).tap();await expect(editor.getByText('Seu quiz está pronto.',{exact:true})).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),herQuizKey)).toBe(before);
  await page.reload();await page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true}).tap();await expect(modal(page).getByText('Seu quiz está pronto.',{exact:true})).toBeVisible();
  await modal(page).getByRole('button',{name:'Editar meu quiz',exact:true}).tap();await expect(modal(page).getByRole('checkbox',{name:'Alternativa 3 correta',exact:true})).toBeChecked();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/her-couple-${width}.png`});
});
test('validates at least one correct answer and supports all four; preserves edits, comments and order',async({page})=>{
  await enter(page,5);const editor=modal(page);
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).questions[0],herCoupleKey);
  await editor.getByRole('textbox',{name:'Enunciado',exact:true}).fill('Uma pergunta revisada');
  await editor.getByRole('checkbox',{name:'Alternativa 1 correta',exact:true}).uncheck();await editor.getByRole('checkbox',{name:'Alternativa 3 correta',exact:true}).uncheck();
  await expect(editor.getByRole('button',{name:'Concluir quiz',exact:true})).toBeDisabled();
  for(let option=1;option<=4;option++)await editor.getByRole('checkbox',{name:`Alternativa ${option} correta`,exact:true}).check();
  await expect(editor.getByRole('button',{name:'Concluir quiz',exact:true})).toBeEnabled();
  await editor.getByRole('button',{name:'Remover comentário',exact:true}).tap();await expect(editor.getByRole('textbox',{name:'Comentário explicativo (opcional)',exact:true})).toHaveValue('');
  await editor.getByRole('button',{name:'Mover para baixo',exact:true}).tap();
  await editor.getByRole('button',{name:'Excluir pergunta',exact:true}).tap();await editor.getByRole('button',{name:'Cancelar exclusão',exact:true}).tap();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).questions[1].text,herCoupleKey)).toBe('Uma pergunta revisada');
  const edited=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).questions[1],herCoupleKey);expect(edited.id).toBe(original.id);expect(edited.options.map((option:{id:string})=>option.id)).toEqual(original.options.map((option:{id:string})=>option.id));expect(edited.comment).toBe('');
  await editor.getByRole('button',{name:'Excluir pergunta',exact:true}).tap();await editor.getByRole('button',{name:'Confirmar exclusão',exact:true}).tap();await expect(editor.getByRole('button',{name:'Concluir quiz',exact:true})).toBeDisabled();
  await editor.getByRole('button',{name:'Voltar ao meu universo',exact:true}).tap();await expect(page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true})).toBeFocused();
  await page.reload();await page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true}).tap();await expect(modal(page).getByText(/4 perguntas válidas de 4 criadas/)).toBeVisible();
});
test('creates the twenty-fifth question with paginated rendering',async({page})=>{
  await enter(page,24);const editor=modal(page);await expect(editor.locator('.builder-question-list>button:not(.builder-primary)')).toHaveCount(8);
  await editor.getByRole('button',{name:'Nova pergunta',exact:true}).tap();await fill(page,25);await expect(editor.getByText(/25 perguntas válidas de 25 criadas/)).toBeVisible();
  await editor.getByRole('button',{name:'Concluir quiz',exact:true}).tap();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).questions.length,herCoupleKey)).toBe(25);
});
test('scores 0 and 100 and resets selections when responding again',async({page})=>{
  await enter(page,5);const editor=modal(page);await editor.getByRole('button',{name:'Prévia como participante',exact:true}).tap();
  for(const expected of [0,100]){
    for(let question=1;question<=5;question++){
      await editor.getByRole('radio',{name:`Resposta ${expected===100?3:2} da pergunta ${question}`,exact:true}).check();
      await editor.getByRole('button',{name:'Confirmar resposta',exact:true}).tap();await editor.getByRole('button',{name:question===5?'Ver resultado':'Próxima pergunta',exact:true}).tap();
    }
    await expect(editor.getByRole('heading',{name:`Você me conhece: ${expected}%`,exact:true})).toBeVisible();
    if(expected===0){await editor.getByRole('button',{name:'Responder novamente',exact:true}).tap();await expect(editor.getByRole('radio').first()).not.toBeChecked();}
  }
});
test('new star supports native 3D picking; Nexus introduction is manual and saved',async({page})=>{
  await enter(page,0,false);const editor=modal(page);for(let line=0;line<5;line++)await editor.getByRole('button',{name:'Continuar',exact:true}).tap();
  await editor.getByRole('button',{name:'Voltar ao meu universo',exact:true}).tap();
  const access=page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true});await expect(access).toHaveAttribute('data-onscreen','true');
  const point=await access.evaluate(element=>{const node=element as HTMLElement;node.style.pointerEvents='none';return{x:parseFloat(node.style.left),y:parseFloat(node.style.top)};});await page.touchscreen.tap(point.x,point.y);
  await expect(modal(page).getByRole('button',{name:'Nova pergunta',exact:true})).toBeVisible();await expect(modal(page).locator('.nexus-speech')).toHaveCount(0);
  await modal(page).getByRole('button',{name:'Voltar ao meu universo',exact:true}).tap();await page.mouse.click(point.x,point.y);
  await expect(modal(page)).toBeVisible();
});
test('quota failure preserves the last saved quiz and keeps unsaved work open',async({page})=>{
  await enter(page,5);const editor=modal(page),before=await page.evaluate(key=>localStorage.getItem(key),herCoupleKey);
  await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Quota','QuotaExceededError');original.call(this,name,value);};},herCoupleKey);
  await editor.getByRole('textbox',{name:'Enunciado',exact:true}).fill('Texto ainda não salvo');await editor.getByRole('button',{name:'Voltar ao meu universo',exact:true}).tap();
  await expect(editor).toBeVisible();await expect(editor.getByRole('textbox',{name:'Enunciado',exact:true})).toHaveValue('Texto ainda não salvo');await expect(editor.getByText(/O navegador não permitiu salvar/)).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),herCoupleKey)).toBe(before);
});

test('creator accepts B and D; participant chooses one in preview and visitor without migrating saved data',async({page})=>{
  await enter(page,5);const editor=modal(page);
  for(const option of [1,3])await editor.getByRole('checkbox',{name:`Alternativa ${option} correta`,exact:true}).uncheck();
  for(const option of [2,4])await editor.getByRole('checkbox',{name:`Alternativa ${option} correta`,exact:true}).check();
  await editor.getByRole('button',{name:'Salvar rascunho',exact:true}).click();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),herCoupleKey);
  expect(saved.questions[0].options.map((option:{correct:boolean})=>option.correct)).toEqual([false,true,false,true]);
  for(const choice of [2,4,1]){
    await editor.getByRole('button',{name:'Prévia como participante',exact:true}).click();
    await expect(editor.getByRole('radio')).toHaveCount(4);await expect(editor.getByRole('checkbox')).toHaveCount(0);
    const b=editor.getByRole('radio',{name:'Resposta 2 da pergunta 1',exact:true});
    await b.focus();await page.keyboard.press('Space');
    const selected=editor.getByRole('radio',{name:`Resposta ${choice} da pergunta 1`,exact:true});
    await selected.check();await expect(editor.getByRole('radio',{checked:true})).toHaveCount(1);
    if(choice!==2)await expect(b).not.toBeChecked();
    await expect(editor.getByText('Explicação guardada.',{exact:true})).toHaveCount(0);
    await editor.getByRole('button',{name:'Confirmar resposta',exact:true}).tap();
    await expect(editor.getByText(choice===1?'Resposta incorreta.':'Resposta correta.',{exact:true})).toBeVisible();
    await expect(editor.getByText('Explicação guardada.',{exact:true})).toBeVisible();await expect(selected).toBeDisabled();
    await editor.getByRole('button',{name:'Voltar ao editor',exact:true}).click();
  }
  await editor.getByRole('button',{name:'Concluir quiz',exact:true}).click();
  await editor.getByRole('button',{name:'Voltar ao meu universo',exact:true}).first().click();
  await page.getByRole('link',{name:'Visualizar meu universo',exact:true}).click();
  const before=await page.evaluate(key=>localStorage.getItem(key),herCoupleKey);
  await page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true}).tap();
  const visitor=modal(page);
  await visitor.getByRole('radio',{name:'Resposta 2 da pergunta 1',exact:true}).check();
  await visitor.getByRole('radio',{name:'Resposta 4 da pergunta 1',exact:true}).check();
  await expect(visitor.getByRole('radio',{checked:true})).toHaveCount(1);
  await expect(visitor.getByRole('radio',{name:'Resposta 2 da pergunta 1',exact:true})).not.toBeChecked();
  await visitor.getByRole('button',{name:'Confirmar resposta',exact:true}).tap();
  await expect(visitor.getByText('Resposta correta.',{exact:true})).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),herCoupleKey)).toBe(before);
  await page.reload();await page.getByRole('button',{name:'Voltar à criação',exact:true}).click();
  await page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true}).click();
  await modal(page).getByRole('button',{name:'Editar meu quiz',exact:true}).click();
  for(const option of [2,4])await expect(modal(page).getByRole('checkbox',{name:`Alternativa ${option} correta`,exact:true})).toBeChecked();
});
