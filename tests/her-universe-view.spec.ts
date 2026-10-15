import {postDraftReset} from './helpers/herDraftBaseline';
import { expect, test, type Page } from '@playwright/test';
test.beforeEach(async({page})=>postDraftReset(page));
import { herUniverseKey } from '../src/experiences/herUniverse/progress';
import { herQuizKey } from '../src/experiences/herCompatibility/repository';
import { herCoupleKey } from '../src/experiences/herCouple/repository';
test.use({hasTouch:true});
async function seed(page:Page,status='completed'){
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(({galaxyKey,compatibilityKey,coupleKey,status})=>{
    if(!localStorage.getItem(galaxyKey))localStorage.setItem(galaxyKey,JSON.stringify({version:1,accepted:true,created:true,stage:'ready',colors:['rosa','turquesa']}));
    if(!localStorage.getItem(compatibilityKey))localStorage.setItem(compatibilityKey,JSON.stringify({version:1,introSeen:true,status,questions:Array.from({length:5},(_,i)=>({id:`compatibility-${i}`,text:`Pergunta compatibilidade ${i+1}`,options:[1,2,3,4].map(weight=>({id:`compatibility-${i}-${weight}`,text:`Escolha ${weight} da pergunta ${i+1}`,weight}))}))}));
    if(!localStorage.getItem(coupleKey))localStorage.setItem(coupleKey,JSON.stringify({version:1,introSeen:true,status,questions:Array.from({length:5},(_,i)=>({id:`couple-${i}`,text:`Pergunta casal ${i+1}`,comment:'Comentário da criadora.',options:[1,2,3,4].map(choice=>({id:`couple-${i}-${choice}`,text:`Resposta ${choice} da pergunta ${i+1}`,correct:choice===1||choice===3}))}))}));
  },{galaxyKey:herUniverseKey,compatibilityKey:herQuizKey,coupleKey:herCoupleKey,status});
}
const snapshot=(page:Page)=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),[herUniverseKey,herQuizKey,herCoupleKey]);
for(const width of [320,390,430,1440])test(`view route has both participant quizzes and no editor at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:850});await seed(page);await page.goto('/universo-dela/visao');
  const before=await snapshot(page);await expect(page.getByRole('region',{name:'Explorar o universo dela'})).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('canvas')).toHaveAttribute('data-her-colors','["rosa","turquesa"]');await expect(page.locator('.nexus-dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).tap();
  const compatibility=page.getByRole('dialog',{name:'Nossa Compatibilidade',exact:true});
  await expect(compatibility.getByRole('textbox')).toHaveCount(0);await expect(compatibility.getByRole('combobox')).toHaveCount(0);
  await expect(compatibility.getByRole('button',{name:/editor|Editar|Excluir|Mover|Concluir|Nova pergunta/})).toHaveCount(0);
  await expect(compatibility.locator('.quiz-visuals')).toBeVisible();await expect(compatibility.getByRole('progressbar')).toHaveAttribute('max','5');
  await compatibility.screenshot({path:`test-results/quiz-compatibility-view-${width}.png`});
  for(let i=1;i<=5;i++){await compatibility.getByRole('radio',{name:`Escolha 4 da pergunta ${i}`,exact:true}).check();await compatibility.getByRole('button',{name:i===5?'Ver resultado':'Próxima pergunta',exact:true}).tap();}
  await expect(compatibility.getByRole('heading',{name:'Compatibilidade: 100%',exact:true})).toBeVisible();await compatibility.screenshot({path:`test-results/quiz-compatibility-result-${width}.png`});await compatibility.getByRole('button',{name:'Voltar à galáxia',exact:true}).tap();await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true}).tap();const couple=page.getByRole('dialog',{name:'Quanto Você Me Conhece?',exact:true});
  await couple.screenshot({path:`test-results/quiz-couple-view-${width}.png`});
  for(let i=1;i<=5;i++){
    await expect(couple.getByText('Comentário da criadora.',{exact:true})).toHaveCount(0);
    await couple.getByRole('radio',{name:`Resposta ${i===1?2:3} da pergunta ${i}`,exact:true}).check();
    await expect(couple.getByRole('button',{name:i===5?'Ver resultado':'Próxima pergunta',exact:true})).toBeDisabled();
    await couple.getByRole('button',{name:'Confirmar resposta',exact:true}).tap();await expect(couple.getByText('Comentário da criadora.',{exact:true})).toBeVisible();
    await couple.getByRole('button',{name:i===5?'Ver resultado':'Próxima pergunta',exact:true}).tap();
  }
  await expect(couple.getByRole('heading',{name:'Você me conhece: 80%',exact:true})).toBeVisible();await couple.getByRole('button',{name:'Voltar à galáxia',exact:true}).tap();
  expect(await snapshot(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/her-view-${width}.png`});
});
test('internal navigation retains one canvas, its colors, camera and both draft repositories',async({page})=>{
  await seed(page);await page.goto('/universo-dela');const before=await snapshot(page);
  await expect(page.locator('canvas[data-renderer="webgl"]')).toBeVisible();
  await page.evaluate(()=>{(window as Window&{viewCanvas?:HTMLCanvasElement}).viewCanvas=document.querySelector('canvas')!;});
  await page.getByRole('link',{name:'Visualizar meu universo',exact:true}).tap();await expect(page).toHaveURL(/\/universo-dela\/visao$/);
  expect(await page.evaluate(()=>(window as Window&{viewCanvas?:HTMLCanvasElement}).viewCanvas===document.querySelector('canvas'))).toBe(true);
  const canvas=page.locator('canvas');await canvas.focus();const pose=await canvas.getAttribute('data-camera-pose');await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await expect.poll(()=>canvas.getAttribute('data-camera-pose')).not.toBe(pose);
  const current=await canvas.getAttribute('data-camera-pose');await page.getByRole('button',{name:'Voltar à criação',exact:true}).tap();await expect(page).toHaveURL(/\/universo-dela$/);
  await expect(page.locator('section[data-her-stage="travel"]')).toHaveCount(0);expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(()=>(window as Window&{viewCanvas?:HTMLCanvasElement}).viewCanvas===document.querySelector('canvas'))).toBe(true);
  expect(await canvas.getAttribute('data-camera-pose')).not.toBe(pose);expect(current).not.toBe(pose);
  await page.goBack();await expect(page).toHaveURL(/\/universo-dela\/visao$/);await expect(page.getByRole('region',{name:'Explorar o universo dela'})).toBeVisible();
});
test('valid drafts remain private; completed quizzes become available after returning from creation',async({page})=>{
  await seed(page,'draft');await page.goto('/universo-dela/visao');await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true})).toHaveCount(0);
  await expect(page.getByText('As experiências deste universo ainda estão sendo preparadas.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Voltar à criação',exact:true}).tap();await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).tap();
  const editor=page.getByRole('dialog',{name:'Nossa Compatibilidade',exact:true});await editor.getByRole('button',{name:'Concluir quiz',exact:true}).tap();await editor.getByRole('button',{name:'Voltar ao meu universo',exact:true}).first().tap();
  await page.getByRole('link',{name:'Visualizar meu universo',exact:true}).tap();await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true})).toHaveCount(0);
});
for(const raw of [null,'broken',JSON.stringify({version:99,accepted:true,created:true,colors:['azul']})])test(`unavailable galaxy data is handled without overwrite: ${raw??'missing'}`,async({page})=>{
  await page.addInitScript(({key,raw})=>{if(raw!==null)localStorage.setItem(key,raw);},{key:herUniverseKey,raw});await page.goto('/universo-dela/visao');
  await expect(page.getByRole('region',{name:'Universo indisponível'})).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);expect(await page.evaluate(key=>localStorage.getItem(key),herUniverseKey)).toBe(raw);
  await page.getByRole('button',{name:'Voltar à criação',exact:true}).tap();await expect(page).toHaveURL(/\/universo-dela$/);
});
test('a corrupt quiz cannot block the galaxy or expose a fabricated experience',async({page})=>{
  await seed(page);await page.addInitScript(key=>localStorage.setItem(key,'corrupt'),herQuizKey);await page.goto('/universo-dela/visao');
  await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true})).toBeVisible();await expect(page.getByText(/Uma das experiências não pôde ser carregada/)).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),herQuizKey)).toBe('corrupt');
});
test('fallback canvas and blocked storage both have a functional safe route',async({page})=>{
  await seed(page);await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){if(String(args[0]).startsWith('webgl'))return null;return original.apply(this,args);} as typeof original;});
  await page.goto('/universo-dela/visao');await expect(page.locator('canvas[data-renderer="canvas2d"]')).toBeVisible();await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Nossa Compatibilidade',exact:true})).toBeVisible();
  await page.addInitScript(keys=>{const original=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(keys.includes(key))throw new DOMException('Blocked','SecurityError');return original.call(this,key);};},[herUniverseKey,herQuizKey,herCoupleKey]);await page.reload();await expect(page.getByRole('region',{name:'Universo indisponível'})).toBeVisible();
});
test('mouse and touch explore the 3D camera; Escape returns from a star without reload',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await seed(page);await page.goto('/universo-dela/visao');const canvas=page.locator('canvas');const before=await canvas.getAttribute('data-camera-pose');
  await page.mouse.move(40,420);await page.mouse.down();await page.mouse.move(90,460);await page.mouse.up();await expect.poll(()=>canvas.getAttribute('data-camera-pose')).not.toBe(before);
  const mousePose=await canvas.getAttribute('data-camera-pose'),touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:50,y:420,id:31}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:440,id:31}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  await expect.poll(()=>canvas.getAttribute('data-camera-pose')).not.toBe(mousePose);
  await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'Nossa Compatibilidade',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toBeFocused();
  expect(errors).toEqual([]);
});

test('shared participant presentation respects motion and keyboard in preview and view',async({page})=>{
  await seed(page);await page.goto('/universo-dela/visao');
  await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).focus();await page.keyboard.press('Enter');
  const modal=page.getByRole('dialog');
  await expect(modal.locator('.quiz-card .quiz-visuals')).toBeVisible();
  expect(await modal.locator('.her-question-heading').evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
  await modal.getByRole('radio').first().focus();await page.keyboard.press('Space');await expect(modal.getByRole('radio').first()).toBeChecked();
  await page.emulateMedia({reducedMotion:'no-preference'});
  expect(await modal.locator('.her-question-heading').evaluate(node=>getComputedStyle(node).animationName)).toBe('quiz-enter');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Voltar à criação',exact:true}).click();
  await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).click();
  await page.getByRole('button',{name:'Responder meu quiz',exact:true}).click();
  await expect(page.getByRole('dialog').locator('.quiz-card .quiz-visuals')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('progressbar')).toHaveAttribute('max','5');
});

for(const width of [320,390,430])test(`fallback keeps letters holes and both quizzes independently clickable at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===320?568:844});await seed(page);
 await page.addInitScript(()=>{localStorage.setItem('meu-universo.her-letters.v1',JSON.stringify([{id:'her-letter-controls',title:'Carta acessível',paragraphs:['Mensagem própria.'],position:[5,0,-2]}]));localStorage.setItem('meu-universo.her-black-holes.v1',JSON.stringify([{id:'her-hole-controls',position:[-5,0,-2],crystals:['strength','mirror','silence','enough','arthur'].map(id=>({id,title:'',text:''})),starLetter:null}]));const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){if(String(args[0]).includes('webgl'))return null;return original.apply(this,args);} as typeof original;});
 await page.goto('/universo-dela/visao');await expect(page.locator('canvas[data-renderer=canvas2d]')).toBeVisible();
 for(const name of ['Nossa Compatibilidade','Quanto Você Me Conhece?']){await page.getByRole('button',{name,exact:true}).tap();const dialog=page.getByRole('dialog',{name,exact:true});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Voltar à galáxia',exact:true}).tap();await expect(dialog).toHaveCount(0);}
 await page.getByRole('button',{name:'Abrir carta: Carta acessível',exact:true}).tap();const letter=page.getByRole('dialog',{name:'Carta acessível',exact:true});await expect(letter).toBeVisible();await letter.getByRole('button',{name:'Fechar carta',exact:true}).tap();await expect(letter).toHaveCount(0);
 await page.getByRole('button',{name:'Entrar no buraco negro 1',exact:true}).tap();await expect(page.getByRole('region',{name:'Buraco Negro dos Segredos',exact:true})).toBeVisible();await page.getByRole('button',{name:'Voltar à galáxia',exact:true}).tap();await expect(page.getByRole('region',{name:'Buraco Negro dos Segredos',exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
