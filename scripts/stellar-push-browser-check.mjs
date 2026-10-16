/* global process, fetch, document, localStorage, navigator, console */
// Isolated persistent browser profile; never reuses either person's browser data.
import {chromium} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
if(process.env.STELLAR_PUSH_PRODUCTION_TEST!=='true')throw Error('Explicit production test opt-in required');
const site='https://onde-as-estrelas-nos-encontram.vercel.app',api='https://ogwgguspttvpnjdulsed.supabase.co/functions/v1/';
const directory='test-results/stellar-push-20261016',result={device:null,letter:null,subscriptionSupported:false,actualDelivered:false,reason:null};
await mkdir(directory,{recursive:true});
const save=()=>writeFile(`${directory}/production-browser-test.json`,JSON.stringify(result,null,2));
const context=await chromium.launchPersistentContext(`${directory}/isolated-push-profile`,{channel:'msedge',headless:true,ignoreDefaultArgs:['--disable-background-networking'],viewport:{width:390,height:850},hasTouch:true});
await context.grantPermissions(['notifications'],{origin:site});
let device;
const call=async(fn,body)=>{const r=await fetch(api+fn,{method:'POST',headers:{origin:site,'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(`${body.action} HTTP ${r.status}`);return data;};
try{
 const page=context.pages()[0]??await context.newPage();
 // Prevent the galaxy's arrival polling from marking real mail noticed.
 await context.route('**/functions/v1/stellar-mail',async route=>{const body=route.request().postDataJSON();if(body.action==='arrival')return route.fulfill({status:200,contentType:'application/json',body:'{"id":null}'});if(body.action==='mailbox')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor:body.universe,rows:[],hasMore:false,unread:0})});return route.abort();});
 await page.goto(`${site}/universo-dela/visao`);await page.emulateMedia({reducedMotion:'reduce'});
 const bell=page.locator('.stellar-push-bell');await bell.waitFor({timeout:30000});await bell.click();
 const activate=page.getByRole('button',{name:'Ativar notificações',exact:true});await activate.waitFor();
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(n=>n.textContent==='Ativar notificações')?.disabled,{},{timeout:20000});
 await activate.click();
 try{await page.waitForFunction(()=>document.querySelector('.stellar-push-bell')?.getAttribute('data-active')==='true',{},{timeout:30000});}
 catch{result.reason=await page.locator('.stellar-push-panel [role=status]').textContent().catch(()=> 'Browser push service unavailable');throw Error(result.reason||'Browser could not subscribe');}
 device=JSON.parse(await page.evaluate(()=>localStorage.getItem('meu-universo.stellar-push.device.v1')));result.device=device.device;result.subscriptionSupported=true;await save();
 const id=randomUUID();result.letter=id;await save();
 await call('stellar-mail',{action:'send',universe:'arthur',id,title:`CODEX-PUSH-BROWSER-${id}`,content:'Carta fictícia isolada para validar a entrega Web Push. Será removida.'});
 await page.waitForFunction(async letterId=>{const registration=await navigator.serviceWorker.ready;return (await registration.getNotifications({tag:`stellar-mail-${letterId}`})).length===1;},id,{timeout:45000});
 const notice=await page.evaluate(async letterId=>{const r=await navigator.serviceWorker.ready;const n=(await r.getNotifications({tag:`stellar-mail-${letterId}`}))[0];return {title:n.title,body:n.body,url:n.data.url};},id);
 if(notice.body!=='Uma nova carta de Arthur chegou ao seu universo.'||!notice.url.includes('/universo-dela/visao?stellar-letter='))throw Error('Unexpected notification routing');
 result.actualDelivered=true;result.notification=notice;
 await page.screenshot({path:`directory-placeholder/production-bell.png`.replace('directory-placeholder',directory)});
}catch(e){result.reason=result.reason||e.message;}
finally{
 if(!device){const page=context.pages()[0];try{device=JSON.parse(await page.evaluate(()=>localStorage.getItem('meu-universo.stellar-push.device.v1')));result.device=device?.device;}catch{/* No device was created. */}}
 if(result.letter)await call('stellar-mail',{action:'delete',universe:'arthur',id:result.letter,revision:1});
 if(device){const state=await call('stellar-push',{action:'status',...device});if(state.enabled)await call('stellar-push',{action:'cancel',...device,expected:state.generation});}
 await save();await context.close();
 console.log(JSON.stringify(result));
}
