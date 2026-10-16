import webpush from 'npm:web-push@3.6.7';
import {HttpError} from './security.ts';
import {dispatchLetterPush} from './stellarPushHandler.ts';
const url=Deno.env.get('SUPABASE_URL')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
export const vapidPublicKey=Deno.env.get('STELLAR_VAPID_PUBLIC_KEY')??'';
export async function pushDb(method:string,path:string,body?:unknown){
 const response=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new HttpError(data?.code==='P0001'||data?.code==='23505'?409:data?.code==='42501'?403:data?.code==='22023'?400:503,data?.code==='P0001'?'A inscrição mudou em outra janela. Atualize antes de confirmar.':'Não foi possível atualizar as notificações.');
 return data;
}
export async function deliverPush(id:string){
 const privateKey=Deno.env.get('STELLAR_VAPID_PRIVATE_KEY')??'';
 if(!vapidPublicKey||!privateKey)return;
 await dispatchLetterPush(pushDb,id,async(delivery,payload)=>{
  await webpush.sendNotification(delivery.subscription,JSON.stringify(payload),{vapidDetails:{subject:'https://onde-as-estrelas-nos-encontram.vercel.app',publicKey:vapidPublicKey,privateKey},TTL:86400,urgency:'normal',timeout:5000});
 });
}
