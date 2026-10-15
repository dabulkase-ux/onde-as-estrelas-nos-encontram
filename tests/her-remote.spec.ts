import {expect,test,type BrowserContext,type Page} from '@playwright/test';
import {readyDocument,universeMock} from './helpers/herUniverseMock';
import {experience} from '../src/config/experience';
import {herUniverseKey} from '../src/experiences/herUniverse/progress';
import {herQuizKey} from '../src/experiences/herCompatibility/repository';
import {herCoupleKey} from '../src/experiences/herCouple/repository';
import {postDraftReset} from './helpers/herDraftBaseline';
import {draftKeys,draftResetKey} from '../src/experiences/herUniverse/draftReset';
test.beforeEach(async({page},info)=>{if(!info.title.startsWith('one-time draft reset'))await postDraftReset(page);});
async function connect(context:BrowserContext,mock:ReturnType<typeof universeMock>){
 await context.route('https://stage5.invalid/**',async route=>{
  const url=route.request().url();expect(url).not.toContain('/auth/');expect(route.request().headers().authorization).toBeUndefined();
  const headers={'Access-Control-Allow-Origin':'http://localhost:5175','Access-Control-Allow-Headers':'*','Content-Type':'application/json'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  const response=await mock.handler(new Request(url,{method:'POST',headers:{Origin:'http://localhost:5175','Content-Type':'application/json'},body:route.request().postData()}));await route.fulfill({status:response.status,headers,body:await response.text()});
 });
}
async function seed(page:Page){await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(({galaxy,quiz,couple,doc})=>{if(!localStorage.getItem(galaxy)){localStorage.setItem(galaxy,JSON.stringify(doc.galaxy));localStorage.setItem(quiz,JSON.stringify(doc.compatibility));localStorage.setItem(couple,JSON.stringify(doc.couple));}},{galaxy:herUniverseKey,quiz:herQuizKey,couple:herCoupleKey,doc:readyDocument()});}
async function publish(page:Page){await page.getByRole('button',{name:'Salvar e publicar',exact:true}).click();const modal=page.getByRole('dialog',{name:'Publicação do meu universo'});await expect(modal.getByRole('textbox')).toHaveCount(0);await expect(modal.getByText(/Universo publicado\./)).toBeVisible();return modal;}

test('one-time draft reset clears arbitrary old data, starts at colors and preserves new autosaved quizzes',async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(({doc,keys})=>{
  if(sessionStorage.getItem('reset-test-seeded'))return;
  for(const storage of [localStorage,sessionStorage]){
   for(const key of keys)storage.setItem(key,'arbitrary old backup');
   storage.setItem(keys[0],JSON.stringify(doc.galaxy));storage.setItem(keys[1],JSON.stringify(doc.compatibility));storage.setItem(keys[2],JSON.stringify(doc.couple));
   storage.setItem('meu-universo.her-cleanup.2026-10-14.v1',JSON.stringify({removed:[],version:1}));
   storage.setItem('meu-universo.her-cleanup.2026-10-14.v2',JSON.stringify({removed:[],version:2}));
  }
  localStorage.setItem('meu-universo.compatibility.v1','original-preserved');sessionStorage.setItem('meu-universo.admin-session.v1','admin-preserved');sessionStorage.setItem('reset-test-seeded','yes');
 },{doc:readyDocument(),keys:[...draftKeys]});
 await page.goto('/universo-dela');await expect(page.locator('section[data-her-stage="colors"]')).toBeVisible();
 expect(await page.evaluate(keys=>keys.slice(1).map(key=>localStorage.getItem(key)),[...draftKeys])).toEqual(draftKeys.slice(1).map(()=>null));
 expect(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),[...draftKeys])).toEqual(draftKeys.map(()=>null));
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).colors,herUniverseKey)).toEqual([]);
 expect(await page.evaluate(()=>[localStorage.getItem('meu-universo.compatibility.v1'),sessionStorage.getItem('meu-universo.admin-session.v1')])).toEqual(['original-preserved','admin-preserved']);
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('button',{name:'Roxo',exact:true}).click();await page.getByRole('button',{name:'Criar minhas estrelas',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();
 for(const kind of ['compatibility','couple']){
  const title=kind==='couple'?'Quanto Você Me Conhece?':'Nossa Compatibilidade';await page.getByRole('button',{name:title,exact:true}).click();const editor=page.getByRole('dialog',{name:title,exact:true});
  for(let i=0;i<(kind==='couple'?5:4);i++)await editor.getByRole('button',{name:'Continuar',exact:true}).click();
  await editor.getByRole('button',{name:'Nova pergunta',exact:true}).click();await editor.getByRole('textbox',{name:'Enunciado',exact:true}).fill(`Novo rascunho ${kind}`);
  for(let i=1;i<=4;i++)await editor.getByRole('textbox',{name:`Texto da alternativa ${i}`,exact:true}).fill(`Nova alternativa ${i}`);
  if(kind==='couple'){await editor.getByRole('checkbox',{name:'Alternativa 2 correta',exact:true}).check();await editor.getByRole('textbox',{name:'Comentário explicativo (opcional)',exact:true}).fill('Novo comentário legítimo');}
  else await editor.getByRole('combobox',{name:'Peso da alternativa 4',exact:true}).selectOption('4');
  await editor.getByRole('button',{name:'Voltar ao meu universo',exact:true}).last().click();
 }
 const before=await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[herUniverseKey,herQuizKey,herCoupleKey]);
 await page.reload();await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();
 expect(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[herUniverseKey,herQuizKey,herCoupleKey])).toEqual(before);expect(mock.publications.size).toBe(0);
 await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).click();await expect(page.getByRole('textbox',{name:'Enunciado',exact:true})).toHaveValue('Novo rascunho compatibility');
});

test('one-time draft reset keeps a pristine visitor clean',async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);await page.goto('/universo-dela/visao');await expect(page.getByRole('heading',{name:'Este universo ainda não foi publicado.',exact:true})).toBeVisible();
 expect(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[...draftKeys])).toEqual(draftKeys.map(()=>null));expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).status,draftResetKey)).toBe('done');
});

test('one-time draft reset returns to colors even when only a backup remains',async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);await page.addInitScript(()=>localStorage.setItem('meu-universo.before-remote-import.v1','old backup'));
 await page.goto('/universo-dela');await expect(page.locator('section[data-her-stage="colors"]')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('meu-universo.before-remote-import.v1'))).toBeNull();
});

test('a new browser goes directly to the singleton and never recreates an editor from public colors',async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);await mock.request({action:'publish',revision:0,document:readyDocument()});
 await page.goto('/universo-dela');await expect(page).toHaveURL(/\/universo-dela\/visao$/);await expect(page.getByRole('region',{name:'Explorar o universo dela'})).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),herUniverseKey)).toBeNull();expect(mock.publications.size).toBe(1);
 await page.reload();await expect(page.getByRole('region',{name:'Explorar o universo dela'})).toBeVisible();expect(mock.publications.size).toBe(1);
});

test('public publication, both visitor quizzes, server correction and republication without Auth',async({page,browser})=>{
 const mock=universeMock();await connect(page.context(),mock);await seed(page);await page.goto('/universo-dela');const panel=await publish(page);const link=await panel.getByRole('link').getAttribute('href');
 const other=await browser.newContext();await connect(other,mock);const visitor=await other.newPage();await visitor.emulateMedia({reducedMotion:'reduce'});await visitor.goto(link!);
 await expect(visitor.getByRole('region',{name:'Explorar o universo dela'})).toBeVisible();expect(await visitor.evaluate(()=>localStorage.getItem('meu-universo.creator-auth.v1'))).toBeNull();
 expect(JSON.stringify(await (await mock.request({action:'public'})).json())).not.toMatch(/weight|correct|comment/);
 for(const kind of ['compatibility','couple']){
  const name=kind==='couple'?'Quanto Você Me Conhece?':'Nossa Compatibilidade';await visitor.getByRole('button',{name,exact:true}).click();const quiz=visitor.getByRole('dialog',{name,exact:true});
  for(let index=1;index<=5;index++){
   const text=kind==='couple'?(index===1?'Resposta 1':'Resposta 4'):'Preferência 4';await quiz.getByRole('radio',{name:text,exact:true}).check();
   if(kind==='couple')await expect(quiz.getByText(`Comentário ${index}`,{exact:true})).toHaveCount(0);
   await quiz.getByRole('button',{name:'Confirmar resposta',exact:true}).click();await quiz.getByRole('button',{name:index===5?'Ver resultado':'Próxima pergunta',exact:true}).click();
  }
  await expect(quiz.getByRole('heading',{name:kind==='couple'?'Você me conhece: 80%':'Compatibilidade: 100%',exact:true})).toBeVisible();await quiz.getByRole('button',{name:'Voltar à galáxia',exact:true}).click();
 }
 const doc=readyDocument();doc.galaxy.colors=['azul'];doc.couple.status='draft';await mock.request({action:'publish',revision:1,document:doc});await visitor.reload();await expect(visitor.locator('canvas')).toHaveAttribute('data-her-colors','["azul"]');await expect(visitor.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true})).toHaveCount(0);await other.close();
});
test('local draft edits survive reload and never publish automatically',async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);await seed(page);await page.goto('/universo-dela');const panel=await publish(page);await panel.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true}).click();await page.getByRole('button',{name:'Editar meu quiz',exact:true}).click();await page.getByRole('textbox',{name:'Enunciado',exact:true}).fill('Minha alteração ainda local.');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).questions[0].text,herCoupleKey)).toBe('Minha alteração ainda local.');expect(mock.universe?.document.couple.questions[0].text).toBe('Casal 1');
 await page.reload();await page.getByRole('button',{name:'Quanto Você Me Conhece?',exact:true}).click();await expect(page.getByRole('textbox',{name:'Enunciado',exact:true})).toHaveValue('Minha alteração ainda local.');
});
for(const width of [320,390,430])test(`publication control and public empty/error recovery at ${width}px`,async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);await page.setViewportSize({width,height:850});await seed(page);await page.goto('/universo-dela');
 const button=await page.getByRole('button',{name:'Salvar e publicar',exact:true}).boundingBox(),header=await page.locator('.her-universe header a').boundingBox();expect(button!.y).toBeGreaterThanOrEqual(header!.y+header!.height);expect(button!.x+button!.width).toBeLessThanOrEqual(width);await expect(page.locator('.nexus-speech')).toHaveCount(0);
 await page.goto('/universo-dela/visao');await expect(page.getByRole('heading',{name:'Este universo ainda não foi publicado.',exact:true})).toBeVisible();mock.setNetworkError(true);await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.getByRole('alert')).toBeVisible();mock.setNetworkError(false);await mock.request({action:'publish',revision:0,document:readyDocument()});await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.getByRole('region',{name:'Explorar o universo dela'})).toBeVisible();
});
test('failed publication keeps drafts and explicit retry recovers without an account',async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);await seed(page);await page.goto('/universo-dela');mock.setNetworkError(true);await page.getByRole('button',{name:'Salvar e publicar',exact:true}).click();const panel=page.getByRole('dialog');await expect(panel.getByRole('alert')).toBeVisible();expect(mock.publications.size).toBe(0);mock.setNetworkError(false);await panel.getByRole('button',{name:'Tentar publicar novamente'}).click();await expect(panel.getByText(/Universo publicado\./)).toBeVisible();expect(mock.publications.size).toBe(1);
});
test('an outdated revision cannot overwrite the publication and local cache remains intact',async({page})=>{
 const mock=universeMock();await connect(page.context(),mock);await seed(page);await page.goto('/universo-dela');const panel=await publish(page);await panel.getByRole('button',{name:'Fechar'}).click();const changed=readyDocument();changed.galaxy.colors=['azul'];await mock.request({action:'publish',revision:1,document:changed});
 await page.getByRole('button',{name:'Salvar e publicar',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Conflito');expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).colors,herUniverseKey)).toEqual(['rosa','turquesa']);expect(mock.universe?.document.galaxy.colors).toEqual(['azul']);
});

test('Eyes to Nexus, palette, galaxy, both quiz builders and publication without authentication form',async({page})=>{
 test.setTimeout(180000);const mock=universeMock();await connect(page.context(),mock);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?finish=1');
 const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(day=>String(day).padStart(2,'0')).join('');for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();
 const scanner=page.getByRole('button',{name:/Leitor visual fictício/});await scanner.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:10000});await page.keyboard.up('Enter');await expect(page.getByRole('button',{name:'Sim, pode',exact:true})).toBeVisible({timeout:60000});await page.getByRole('button',{name:'Sim, pode',exact:true}).click();await expect(page).toHaveURL(/\/universo-dela$/,{timeout:10000});
 await expect(page.getByRole('button',{name:'Sim, pode',exact:true})).toHaveCount(0);for(let line=0;line<4;line++)await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.locator('section[data-her-stage="colors"]')).toBeVisible();await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('button',{name:'Rosa',exact:true}).click();await page.getByRole('button',{name:'Turquesa',exact:true}).click();await page.getByRole('button',{name:'Criar minhas estrelas',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();
 for(const kind of ['compatibility','couple']){
  const title=kind==='couple'?'Quanto Você Me Conhece?':'Nossa Compatibilidade';await page.getByRole('button',{name:title,exact:true}).click();const modal=page.getByRole('dialog',{name:title,exact:true});
  for(let line=0;line<(kind==='couple'?5:4);line++)await modal.getByRole('button',{name:'Continuar',exact:true}).click();
  for(let index=1;index<=5;index++){
   await modal.getByRole('button',{name:'Nova pergunta',exact:true}).click();await modal.getByRole('textbox',{name:'Enunciado',exact:true}).fill(`Minha pergunta ${kind} ${index}`);
   for(let option=1;option<=4;option++)await modal.getByRole('textbox',{name:`Texto da alternativa ${option}`,exact:true}).fill(`Alternativa ${option}`);
   if(kind==='couple'){await modal.getByRole('checkbox',{name:'Alternativa 2 correta',exact:true}).check();await modal.getByRole('checkbox',{name:'Alternativa 4 correta',exact:true}).check();}
  }
  await modal.getByRole('button',{name:'Concluir quiz',exact:true}).click();await modal.getByRole('button',{name:'Voltar ao meu universo',exact:true}).last().click();
 }
 const panel=await publish(page);await expect(panel.getByText(/Universo publicado\./)).toBeVisible();expect(mock.universe?.document.couple.status).toBe('completed');expect(mock.universe?.document.compatibility.status).toBe('completed');
});
