import {publicFunctionOrigins} from '../_shared/publicOrigins.ts';
import {makeStellarMailHandler} from '../_shared/stellarMailHandler.ts';
import {HttpError} from '../_shared/security.ts';
import {deliverPush} from '../_shared/stellarPushRuntime.ts';
const url=Deno.env.get('SUPABASE_URL')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
Deno.serve(makeStellarMailHandler({afterSend:id=>EdgeRuntime.waitUntil(deliverPush(id).catch(()=>{console.warn('Stellar Push delivery unavailable');})),origins:publicFunctionOrigins(Deno.env.get('ALLOWED_ORIGINS')),db:async(method,path,body)=>{
 const response=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);
 const conflict=data?.code==='40001'||path==='rpc/stellar_mail'&&data?.code==='P0001';
 if(!response.ok)throw new HttpError(conflict?409:data?.code==='42501'?403:data?.code==='22023'?400:503,conflict?'A carta mudou. Atualize antes de salvar novamente.':data?.code==='42501'?'Esta carta não está disponível para esta pessoa.':'Não foi possível concluir a operação.');
 return data;
}}));
