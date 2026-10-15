import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import {Buffer} from 'node:buffer';
const {fetch,URL,AbortSignal}=globalThis;
const base=process.argv[2]??'https://onde-as-estrelas-nos-encontram.vercel.app';
const final=process.argv.includes('--final');
const request=async(path)=>{const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000),cache:'no-store'});assert.equal(response.status,200,`${path}: HTTP ${response.status}`);return response;};
const routes=[];let html='';
for(const path of ['/','/?finish=1','/universo-dela','/universo-dela/visao','/admin']){const response=await request(path);const body=await response.text();assert.match(body,/<div id="root"/);routes.push({path,status:response.status});if(path==='/')html=body;}
const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match=>match[1]);assert.ok(assets.length>=2);
let code='';const checked=[];
for(const path of assets){const response=await request(path);const body=await response.text();assert.ok(!body.includes('<!doctype html>'),`${path}: unexpected SPA rewrite`);checked.push({path,status:response.status,sha256:createHash('sha256').update(body).digest('hex')});if(path.endsWith('.js'))code+=body;}
const hasRomanticConfirmation=code.includes('Eu te mostrei o meu universo');
const hasDraftReset=code.includes('meu-universo.her-draft-reset.2026-10-14.v1');
if(final){assert.ok(hasRomanticConfirmation,'Romantic confirmation absent from deployed entry');assert.ok(hasDraftReset,'Updated draft reset absent from deployed entry');}
const url=code.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
const modern=code.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
const legacy=[...code.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)].map(match=>match[0]).find(token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url')).role==='anon';}catch{return false;}});
let backend=null;
if(url&&(modern||legacy)){
 assert.equal(url,'https://ogwgguspttvpnjdulsed.supabase.co','Unexpected Supabase project');
 const response=await fetch(`${url}/functions/v1/her-universe`,{method:'POST',headers:{Origin:new URL(base).origin,'Content-Type':'application/json',apikey:modern??legacy},body:JSON.stringify({action:'public'}),signal:AbortSignal.timeout(20000)});
 const body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),new URL(base).origin);backend={status:response.status,cors:true,publicationId:body.publication?.id??null};
}
if(final)assert.ok(backend,'Public backend configuration missing from deployed entry');
console.log(JSON.stringify({base,routes,assets:checked,hasRomanticConfirmation,hasDraftReset,backend},null,2));
