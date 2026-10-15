import {postDraftReset} from './helpers/herDraftBaseline';
import { expect, test, type Page } from '@playwright/test';
test.beforeEach(async({page})=>postDraftReset(page));
import { herQuizKey } from '../src/experiences/herCompatibility/repository';
import { herUniverseKey } from '../src/experiences/herUniverse/progress';
test.use({hasTouch:true});
async function enter(page:Page,introSeen=true,count=0) {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(({universeKey,quizKey,introSeen,count})=>{
    if(!localStorage.getItem(universeKey))localStorage.setItem(universeKey,JSON.stringify({version:1,accepted:true,colors:['roxo','turquesa'],stage:'ready',created:true}));
    if(!localStorage.getItem(quizKey))localStorage.setItem(quizKey,JSON.stringify({version:1,introSeen,status:'draft',questions:Array.from({length:count},(_,index)=>({id:`q${index}`,text:`Pergunta ${index+1}`,options:[1,2,3,4].map(weight=>({id:`q${index}-a${weight}`,text:`Resposta ${weight} da pergunta ${index+1}`,weight}))}))}));
  },{universeKey:herUniverseKey,quizKey:herQuizKey,introSeen,count});
  await page.goto('/universo-dela');await expect(page.locator('canvas[data-renderer="webgl"]')).toBeVisible();
  await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).tap();
  await expect(page.getByRole('dialog',{name:'Nossa Compatibilidade'})).toBeVisible();
}
const builder=(page:Page)=>page.getByRole('dialog',{name:'Nossa Compatibilidade'});
async function fillQuestion(page:Page,index:number) {
  const modal=builder(page);await modal.getByRole('textbox',{name:'Enunciado',exact:true}).fill(`Pergunta ${index}`);
  for(let option=1;option<=4;option++)await modal.getByLabel(`Texto da alternativa ${option}`,{exact:true}).fill(`Resposta ${option} da pergunta ${index}`);
  await modal.getByRole('combobox',{name:'Peso da alternativa 1',exact:true}).selectOption('4');
  await modal.getByRole('combobox',{name:'Peso da alternativa 2',exact:true}).selectOption('1');
  await modal.getByRole('combobox',{name:'Peso da alternativa 3',exact:true}).selectOption('2');
}
for(const width of [320,390,430])test(`create, preview, complete and restore locally at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await enter(page);
  const modal=builder(page);await expect(modal.getByRole('button',{name:'Concluir quiz',exact:true})).toBeDisabled();
  for(let question=1;question<=5;question++){
    await modal.getByRole('button',{name:'Nova pergunta',exact:true}).tap();await fillQuestion(page,question);
    await expect(modal.getByLabel(/Texto da alternativa/)).toHaveCount(4);
    if(question<5)await expect(modal.getByRole('button',{name:'Concluir quiz',exact:true})).toBeDisabled();
  }
  await modal.getByRole('button',{name:'Salvar rascunho',exact:true}).tap();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),herQuizKey);
  expect(saved.questions[0].options.map((option:{weight:number})=>option.weight)).toEqual([4,1,2,4]);
  await modal.getByRole('button',{name:'Prévia como participante',exact:true}).tap();
  for(let question=1;question<=5;question++) {
    const choice=modal.getByRole('radio',{name:`Resposta 2 da pergunta ${question}`,exact:true});
    await choice.focus();await page.keyboard.press('Space');
    if(question===2){await modal.getByRole('button',{name:'Pergunta anterior',exact:true}).tap();await expect(modal.getByRole('radio',{name:'Resposta 2 da pergunta 1',exact:true})).toBeChecked();await modal.getByRole('button',{name:'Próxima pergunta',exact:true}).tap();}
    await modal.getByRole('button',{name:question===5?'Ver resultado':'Próxima pergunta',exact:true}).tap();
  }
  await expect(modal.getByRole('heading',{name:'Compatibilidade: 25%',exact:true})).toBeVisible();
  await modal.getByRole('button',{name:'Voltar ao editor',exact:true}).tap();
  await modal.getByRole('button',{name:'Concluir quiz',exact:true}).tap();await expect(modal.getByText('Seu quiz está pronto.',{exact:true})).toBeVisible();
  await expect(modal.getByText(/somente neste navegador/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).tap();
  await expect(builder(page).getByText('Seu quiz está pronto.',{exact:true})).toBeVisible();
  await builder(page).getByRole('button',{name:'Editar meu quiz',exact:true}).tap();
  await expect(builder(page).getByRole('combobox',{name:'Peso da alternativa 1',exact:true})).toHaveValue('4');
  await page.screenshot({path:`test-results/her-compatibility-${width}.png`});
});
test('edit, reorder, cancel and confirm deletion; autosave preserves stable IDs',async({page})=>{
  await enter(page,true,5);const modal=builder(page);
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),herQuizKey);
  await modal.getByRole('textbox',{name:'Enunciado',exact:true}).fill('Minha pergunta revisada');
  await modal.getByRole('button',{name:'Mover para baixo',exact:true}).tap();
  await expect(modal.getByRole('region',{name:'Editar pergunta 2'})).toBeVisible();
  await modal.getByRole('button',{name:'Excluir pergunta',exact:true}).tap();await modal.getByRole('button',{name:'Cancelar exclusão',exact:true}).tap();
  await expect(modal.getByRole('textbox',{name:'Enunciado',exact:true})).toHaveValue('Minha pergunta revisada');
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).questions[1].text,herQuizKey)).toBe('Minha pergunta revisada');
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),herQuizKey);expect(saved.questions[1].id).toBe(before.questions[0].id);expect(saved.questions[1].options).toEqual(before.questions[0].options);
  await modal.getByRole('button',{name:'Excluir pergunta',exact:true}).tap();await modal.getByRole('button',{name:'Confirmar exclusão',exact:true}).tap();
  await expect(modal.getByRole('button',{name:'Concluir quiz',exact:true})).toBeDisabled();
  await modal.getByRole('button',{name:'Voltar ao meu universo',exact:true}).tap();await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toBeFocused();
  await page.reload();await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).tap();
  await expect(builder(page).getByText(/4 perguntas válidas de 4 criadas/)).toBeVisible();
});
test('more than twenty questions remain editable with paginated rendering',async({page})=>{
  await enter(page,true,24);const modal=builder(page);
  await expect(modal.getByRole('button',{name:'Concluir quiz',exact:true})).toBeEnabled();
  await expect(modal.locator('.builder-question-list>button:not(.builder-primary)')).toHaveCount(8);
  await modal.getByRole('button',{name:'Nova pergunta',exact:true}).tap();await fillQuestion(page,25);
  await expect(modal.getByText(/25 perguntas válidas de 25 criadas/)).toBeVisible();
  await modal.getByRole('button',{name:'Mover para cima',exact:true}).tap();
  await modal.getByRole('button',{name:'Concluir quiz',exact:true}).tap();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),herQuizKey);expect(saved.questions).toHaveLength(25);expect(saved.questions[23].text).toBe('Pergunta 25');
});
test('the 3D star opens the same editor through native canvas picking',async({page})=>{
  await enter(page);await builder(page).getByRole('button',{name:'Voltar ao meu universo',exact:true}).tap();
  const access=page.getByRole('button',{name:'Nossa Compatibilidade',exact:true});
  await expect(access).toHaveAttribute('data-onscreen','true');
  const point=await access.evaluate(element=>{const node=element as HTMLElement;node.style.pointerEvents='none';return {x:parseFloat(node.style.left),y:parseFloat(node.style.top)};});
  await page.touchscreen.tap(point.x,point.y);
  await expect(builder(page)).toBeVisible();await expect(builder(page).getByRole('button',{name:'Nova pergunta',exact:true})).toBeVisible();
});
test('quota failures preserve the saved draft and prevent false completion',async({page})=>{
  await enter(page,true,5);const modal=builder(page);
  const before=await page.evaluate(key=>localStorage.getItem(key),herQuizKey);
  await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(storageKey,value){if(storageKey===key)throw new DOMException('Quota','QuotaExceededError');original.call(this,storageKey,value);};},herQuizKey);
  await modal.getByRole('textbox',{name:'Enunciado',exact:true}).fill('Uma edição que ainda não foi salva');
  await modal.getByRole('button',{name:'Concluir quiz',exact:true}).tap();
  await expect(modal.getByText(/O navegador não permitiu salvar/)).toBeVisible();
  await expect(modal.getByText('Seu quiz está pronto.',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(key=>localStorage.getItem(key),herQuizKey)).toBe(before);
});
test('Nexus introduction uses manual typing and is not repeated after saving',async({page})=>{
  await enter(page,false);const modal=builder(page);await page.emulateMedia({reducedMotion:'no-preference'});
  await modal.getByRole('button',{name:'Continuar',exact:true}).tap();
  await expect(modal.locator('.nexus-speech')).toHaveAttribute('data-speaking','true');
  await modal.getByRole('button',{name:'Mostrar frase completa',exact:true}).tap();
  await expect(modal.locator('.nexus-speech')).toHaveAttribute('data-speaking','false');
  await expect(modal.getByRole('status').first()).toContainText('O chefe já criou o teste dele.');
  await modal.getByRole('button',{name:'Continuar',exact:true}).tap();
  for(let line=2;line<=3;line++){await modal.getByRole('button',{name:'Mostrar frase completa',exact:true}).tap();await modal.getByRole('button',{name:'Continuar',exact:true}).tap();}
  await expect(modal.getByRole('button',{name:'Nova pergunta',exact:true})).toBeVisible();
  await modal.getByRole('button',{name:'Salvar rascunho',exact:true}).tap();await page.reload();await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).tap();
  await expect(builder(page).getByRole('button',{name:'Nova pergunta',exact:true})).toBeVisible();await expect(builder(page).locator('.nexus-speech')).toHaveCount(0);
});
