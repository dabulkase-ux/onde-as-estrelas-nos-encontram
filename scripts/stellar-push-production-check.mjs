/* global process, fetch, Buffer, setTimeout, console */
// Explicit opt-in, isolated IDs only. Never reads/mutates a real letter.
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
if(process.env.STELLAR_PUSH_PRODUCTION_TEST!=='true')throw Error('Explicit production test opt-in required');
const api='https://ogwgguspttvpnjdulsed.supabase.co/functions/v1/',origin='https://onde-as-estrelas-nos-encontram.vercel.app';
const device=randomUUID(),secret=randomBytes(32).toString('hex'),id=randomUUID(),prefix=`CODEX-PUSH-${randomUUID()}`,events=[];
await mkdir('test-results/stellar-push-20261016',{recursive:true});
const journal={device,id,prefix,events};
const save=()=>writeFile('test-results/stellar-push-20261016/production-api-test.json',JSON.stringify(journal,null,2));
await save();
const call=async(fn,body,expected=200)=>{const response=await fetch(api+fn,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,expected,`${body.action}: ${JSON.stringify(data)}`);return data;};
const push=(action,extra={},expected=200)=>call('stellar-push',{action,device,secret,...extra},expected);
const mail=(action,extra={},actor='carol')=>call('stellar-mail',{action,universe:actor,...extra});
const key=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey.export({format:'jwk'});
const subscription={endpoint:`https://fcm.googleapis.com/fcm/send/${prefix}`,keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.from(key.x,'base64url'),Buffer.from(key.y,'base64url')]).toString('base64url'),auth:randomBytes(16).toString('base64url')}};
let sent=false;
try{
 const config=await call('stellar-push',{action:'config'});assert.equal(config.configured,true);
 assert.equal((await push('status')).enabled,false);
 assert.equal((await push('subscribe',{identity:'arthur',expected:0,subscription})).identity,'arthur');
 assert.equal((await push('status')).identity,'arthur');events.push('Arthur binding persists on status');
 await push('subscribe',{identity:'carol',expected:1,subscription},409);events.push('Replacement without confirmation rejected');
 assert.equal((await push('subscribe',{identity:'carol',expected:1,subscription,replace:true})).generation,2);
 assert.equal((await push('status')).identity,'carol');events.push('Confirmed replacement removes previous identity');
 assert.equal((await push('cancel',{expected:2})).enabled,false);
 const active=await push('subscribe',{identity:'arthur',expected:3,subscription});assert.equal(active.generation,4);
 const message={id,title:prefix,content:'Correspondência fictícia e isolada de validação técnica.'};
 await mail('send',message);sent=true;await save();await mail('send',message);events.push('Confirmed send and idempotent retry both succeed');
 await mail('edit',{id,revision:1,title:prefix,content:'Texto fictício revisado.'});
 await mail('read',{id,revision:2},'arthur');events.push('Test-only edit/read succeed without generating new letters');
 // Give waitUntil time to exercise the real VAPID sender against the deliberately
 // invalid FCM endpoint. This validates expired-endpoint handling, not a handset.
 for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,1000));const state=await push('status');if(!state.enabled){events.push('Expired/invalid push endpoint removed automatically');break;}}
 const state=await push('status');journal.finalGeneration=state.generation;journal.expiredEndpointRemoved=!state.enabled;
 await push('cancel',{expected:state.generation});events.push('Backend cancellation confirmed');
 console.log(JSON.stringify({device,id,events,expiredEndpointRemoved:journal.expiredEndpointRemoved}));
}finally{
 if(sent){await mail('delete',{id,revision:2}).catch(()=>mail('delete',{id,revision:1}));events.push('Only owned test letter deleted');}
 try{const state=await push('status');if(state.enabled)await push('cancel',{expected:state.generation});}catch{/* Journal allows exact-ID recovery. */}
 await save();
}
