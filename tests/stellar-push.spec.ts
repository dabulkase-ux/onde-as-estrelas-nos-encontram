import {test,expect,type Page} from '@playwright/test';
import {experience} from '../src/config/experience';
import {readyDocument,universeMock} from './helpers/herUniverseMock';
import {postDraftReset} from './helpers/herDraftBaseline';
async function setup(page:Page,permission='default'){
 await postDraftReset(page);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(initial=>{
  localStorage.setItem('meu-universo.her-universe.v1',JSON.stringify({version:1,accepted:true,created:true,stage:'ready',colors:['roxo']}));
  Object.defineProperty(Notification,'permission',{configurable:true,get:()=>localStorage.getItem('test-push-permission')||initial});
  Object.defineProperty(Notification,'requestPermission',{configurable:true,value:async()=>{localStorage.setItem('test-permission-asked',String(Number(localStorage.getItem('test-permission-asked')||0)+1));localStorage.setItem('test-push-permission',initial==='denied'?'denied':'granted');return Notification.permission;}});
  const subscription=()=>localStorage.getItem('test-push-sub')?{endpoint:'https://fcm.googleapis.com/fcm/send/ui-only',toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/ui-only',keys:{p256dh:btoa('a'.repeat(65)),auth:btoa('b'.repeat(16))}}),unsubscribe:async()=>{localStorage.removeItem('test-push-sub');return true;}}:null;
  const registration={pushManager:{getSubscription:async()=>subscription(),subscribe:async()=>{localStorage.setItem('test-push-sub','yes');return subscription();}}};
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register:async()=>registration,ready:Promise.resolve(registration),getRegistration:async()=>registration}});
 },permission);
 const universe=universeMock('http://localhost:5190');await universe.request({action:'publish',revision:0,document:readyDocument()});
 const states=new Map<string,{identity:string|null;generation:number;enabled:boolean;endpoint:string|null}>(),mutations:Record<string,unknown>[]=[];let unavailable=false,calls=0;
 await page.route('https://stage5.invalid/**',async route=>{
  const r=route.request(),body=r.postDataJSON();
  if(r.url().endsWith('/stellar-push')){
   calls++;if(unavailable)return route.abort('failed');
   let value:unknown,status=200;
   if(body.action==='config')value={publicKey:'B'+ 'a'.repeat(86)};
   else{
    const state=states.get(body.device)??{identity:null,generation:0,enabled:false,endpoint:null};
    if(body.action==='status')value=state;
    else if(body.expected!==state.generation||state.enabled&&state.identity!==body.identity&&body.action==='subscribe'&&!body.replace){value={error:'A inscrição mudou.'};status=409;}
    else{mutations.push(body);const updated={identity:body.action==='cancel'?null:body.identity,generation:state.generation+1,enabled:body.action!=='cancel',endpoint:body.action==='cancel'?null:body.subscription.endpoint};states.set(body.device,updated);value=updated;}
   }
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  }
  if(r.url().endsWith('/stellar-mail'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body.action==='arrival'?{id:null}:{actor:body.universe,rows:[],hasMore:false,unread:0})});
  if(r.url().endsWith('/her-universe')){
   const response=await universe.handler(new Request(r.url(),{method:r.method(),headers:await r.allHeaders(),body:r.postData()}));return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  }
  return route.abort();
 });
 return {mutations,states,get calls(){return calls;},fail(){unavailable=true;}};
}
async function arthur(page:Page){
 await page.goto('/');const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(d=>String(d).padStart(2,'0')).join('');for(const d of pin)await page.getByRole('button',{name:d,exact:true}).click();const scanner=page.getByRole('button',{name:/Leitor visual fictício/});await scanner.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act=recognized]')).toBeVisible();await page.keyboard.up('Enter');await expect(page.locator('.stellar-push-bell')).toBeVisible({timeout:35000});
}
const bell=(page:Page)=>page.locator('.stellar-push-bell');
const panel=(page:Page)=>page.getByRole('dialog',{name:'Avisos do Correio Estelar',exact:true});
test('Arthur and Carol remain separate across visits, replacement requires confirmation, cancel persists',async({page})=>{
 const mock=await setup(page);await arthur(page);await bell(page).click();await expect(panel(page).getByRole('button',{name:'Ativar notificações',exact:true})).toBeEnabled();expect(await page.evaluate(()=>localStorage.getItem('test-permission-asked'))).toBeNull();
 await panel(page).getByRole('button',{name:'Ativar notificações',exact:true}).click();await expect(bell(page)).toHaveAttribute('data-active','true');expect(mock.mutations[0].identity).toBe('arthur');
 await page.goto('/universo-dela/visao');await expect(bell(page)).toBeVisible();await bell(page).click();await expect(panel(page)).toContainText('inscrito para Arthur');await panel(page).getByRole('button',{name:'Ativar notificações para Carol',exact:true}).click();await panel(page).getByRole('button',{name:'Manter Arthur',exact:true}).click();expect(mock.mutations).toHaveLength(1);
 await panel(page).getByRole('button',{name:'Ativar notificações para Carol',exact:true}).click();await panel(page).getByRole('button',{name:'Confirmar substituição',exact:true}).click();await expect(bell(page)).toHaveAttribute('data-active','true');expect(mock.mutations[1]).toMatchObject({identity:'carol',replace:true,expected:1});
 await arthur(page);await bell(page).click();await expect(panel(page)).toContainText('inscrito para Carol');expect(mock.mutations).toHaveLength(2);await arthur(page);await expect(bell(page)).toHaveAttribute('data-active','false');await bell(page).click();await expect(panel(page)).toContainText('inscrito para Carol');
 await page.goto('/universo-dela/visao');await expect(bell(page)).toHaveAttribute('data-active','true');await bell(page).click();await panel(page).getByRole('button',{name:'Desativar neste dispositivo',exact:true}).click();await expect(bell(page)).toHaveAttribute('data-active','false');await page.reload();await bell(page).click();await expect(panel(page).getByRole('button',{name:'Ativar notificações',exact:true})).toBeEnabled();expect([...mock.states.values()][0]).toMatchObject({enabled:false,identity:null});
});
for(const width of [320,390,430])test(`bell only in allowed galaxies, touch panel fits ${width}px`,async({page})=>{
 await setup(page);await page.setViewportSize({width,height:850});await page.goto('/universo-dela');await expect(page.getByRole('button',{name:/^Correio Estelar/})).toBeVisible();await expect(bell(page)).toHaveCount(0);
 await page.goto('/universo-dela/visao');await bell(page).tap();await expect(panel(page).getByRole('button',{name:'Ativar notificações',exact:true})).toBeEnabled();await panel(page).getByRole('button',{name:'Ativar notificações',exact:true}).tap();await expect(bell(page)).toHaveAttribute('data-active','true');await bell(page).tap();await expect(panel(page)).toContainText('para Carol');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel(page).getByRole('button',{name:'Voltar à galáxia',exact:true}).tap();await page.goto('/admin');await expect(bell(page)).toHaveCount(0);
});
test('denied permission never requests permission or enrolls a device',async({page})=>{
 const mock=await setup(page,'denied');await page.goto('/universo-dela/visao');await bell(page).click();await expect(panel(page)).toContainText('O navegador bloqueou');await expect(panel(page).getByRole('button',{name:/Ativar/})).toHaveCount(0);expect(mock.mutations).toHaveLength(0);expect(await page.evaluate(()=>localStorage.getItem('test-permission-asked'))).toBeNull();
});
test('iPhone browser explains Home Screen installation without requesting permission',async({page})=>{
 const mock=await setup(page);await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{configurable:true,value:'iPhone'}));await page.goto('/universo-dela/visao');await bell(page).click();await expect(panel(page)).toContainText('Adicionar à Tela de Início');expect(mock.mutations).toHaveLength(0);expect(mock.calls).toBe(0);
});
test('unavailable backend has bounded checks and no accidental subscription',async({page})=>{
 const mock=await setup(page);mock.fail();await page.goto('/universo-dela/visao');await bell(page).click();await expect(panel(page).getByRole('button',{name:'Verificar disponibilidade',exact:true})).toBeVisible();await page.waitForTimeout(6000);expect(mock.calls).toBeLessThanOrEqual(4);expect(mock.mutations).toHaveLength(0);expect(await page.evaluate(()=>localStorage.getItem('test-permission-asked'))).toBeNull();
});
test('notification deep link opens the original reader without changing push identity',async({page},info)=>{
 const mock=await setup(page),id=crypto.randomUUID(),now=new Date().toISOString(),read:unknown[]=[];
 const letter={id,sender:'arthur',recipient:'carol',title:'Carta isolada do aviso',content:'Somente para a simulação local.',created_at:now,updated_at:now,read_at:null,noticed_at:null,revision:1};
 await page.route('**/functions/v1/stellar-mail',async route=>{const body=route.request().postDataJSON();if(body.action==='read')read.push(body);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body.action==='mailbox'?{actor:'carol',rows:[letter],unread:1,hasMore:false}:body.action==='arrival'?{id:null}:letter)});});
 await page.goto(`/universo-dela/visao?stellar-letter=${id}`);await expect(page.getByRole('dialog',{name:letter.title,exact:true})).toContainText(letter.content);expect(read).toHaveLength(1);expect(mock.mutations).toHaveLength(0);
 await page.getByRole('button',{name:'Fechar carta',exact:true}).click();await page.getByRole('button',{name:'Voltar à galáxia',exact:true}).click();await expect(bell(page)).toBeVisible();await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href','/stellar-mail-carol.webmanifest');await page.screenshot({path:info.outputPath('bell-carol-390.png')});await bell(page).click();await page.screenshot({path:info.outputPath('push-panel-390.png')});
});
test('unsupported browser offers explanation and never enrolls',async({page})=>{
 const mock=await setup(page);await page.addInitScript(()=>{delete (window as unknown as Record<string,unknown>).PushManager;});await page.goto('/universo-dela/visao');await bell(page).click();await expect(panel(page)).toContainText('não oferece suporte');expect(mock.calls).toBe(0);expect(mock.mutations).toHaveLength(0);
});
