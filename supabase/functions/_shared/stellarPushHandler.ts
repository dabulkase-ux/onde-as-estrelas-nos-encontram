import type {Database} from './handler.ts';
import {digest,HttpError} from './security.ts';
export type PushIdentity='arthur'|'carol';
export type DeviceState={identity:PushIdentity|null;generation:number;enabled:boolean;endpoint:string|null};
export const officialSite='https://onde-as-estrelas-nos-encontram.vercel.app';
export function pushDestination(recipient:PushIdentity,id:string){return `${officialSite}${recipient==='carol'?'/universo-dela/visao':'/'}?stellar-letter=${encodeURIComponent(id)}`;}
export function validSubscription(value:unknown){
 if(!value||typeof value!=='object')return false;
 const s=value as {endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}};
 try{
  const url=new URL(String(s.endpoint));
  const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||String(s.endpoint).length>2048||!(allowed.includes(url.hostname)||url.hostname.endsWith('.push.apple.com')||url.hostname.endsWith('.notify.windows.com')))return false;
  const decode=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]+={0,2}$/.test(v)?atob(v.replace(/-/g,'+').replace(/_/g,'/')).length:0;
  return decode(s.keys?.p256dh)===65&&decode(s.keys?.auth)===16;
 }catch{return false;}
}
export function makeStellarPushHandler(settings:{db:Database;origins:string[];publicKey:string}){
 return async(request:Request)=>{
  const origin=request.headers.get('origin')??'',allowed=settings.origins.includes(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin',...(allowed?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Max-Age':'600'};
  const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
  try{
   if(!allowed)throw new HttpError(403,'Origem não permitida.');
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(request.method!=='POST')throw new HttpError(405,'Método não permitido.');
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Envie JSON.');
   const reader=request.body?.getReader(),parts:Uint8Array[]=[];let size=0;
   if(reader)try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();throw new HttpError(413,'Inscrição muito extensa.');}parts.push(value);}}finally{reader.releaseLock();}
   let body:Record<string,unknown>;
   try{const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}body=JSON.parse(new TextDecoder().decode(bytes));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{throw new HttpError(400,'Dados inválidos.');}
   const action=String(body.action),fields:Record<string,string[]>={config:[],status:['device','secret'],subscribe:['device','secret','identity','expected','subscription','replace'],cancel:['device','secret','expected']};
   if(!Object.hasOwn(fields,action)||Object.keys(body).some(k=>k!=='action'&&!fields[action].includes(k)))throw new HttpError(400,'Campos não permitidos.');
   const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
   const rate=await settings.db('POST','rpc/stellar_push_limit',{p_bucket:`ip:${await digest(ip)}`,p_max:60,p_seconds:60});
   if(rate!==true)throw new HttpError(429,'Aguarde um instante para tentar novamente.');
   if(action==='config')return reply({publicKey:settings.publicKey,configured:Boolean(settings.publicKey)});
   if(typeof body.device!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.device)||typeof body.secret!=='string'||!/^[a-f0-9]{64}$/.test(body.secret))throw new HttpError(400,'Instalação inválida.');
   if(action!=='status'){
    if(!Number.isSafeInteger(body.expected)||Number(body.expected)<0)throw new HttpError(400,'Atualize o estado das notificações.');
    if(await settings.db('POST','rpc/stellar_push_limit',{p_bucket:`device:${body.device}`,p_max:10,p_seconds:60})!==true)throw new HttpError(429,'Aguarde um instante para tentar novamente.');
   }
   if(action==='subscribe'&&(!settings.publicKey||!['arthur','carol'].includes(String(body.identity))||!validSubscription(body.subscription)))throw new HttpError(400,'Inscrição Push inválida ou indisponível.');
   return reply(await settings.db('POST','rpc/stellar_push_device',{p_id:body.device,p_hash:await digest(body.secret),p_action:action,p_identity:body.identity??null,p_expected:body.expected??0,p_subscription:body.subscription??null,p_replace:body.replace===true}));
  }catch(e){return reply({error:e instanceof HttpError?e.message:'Não foi possível atualizar as notificações. Tente novamente.'},e instanceof HttpError?e.status:503);}
 };
}

export type PushDelivery={letter_id:string;device_id:string;generation:number;recipient:PushIdentity;subscription:{endpoint:string;keys:{auth:string;p256dh:string}}};
export async function dispatchLetterPush(db:Database,id:string,send:(delivery:PushDelivery,payload:unknown)=>Promise<void>){
 const deliveries=await db('POST','rpc/stellar_push_claim',{p_letter:id}) as PushDelivery[];
 // Claim before external I/O: retries/concurrent send requests cannot duplicate delivery.
 for(let i=0;i<deliveries.length;i+=10)await Promise.all(deliveries.slice(i,i+10).map(async d=>{
  let state='sent';
  try{
   // Recheck after claiming: replacement and cancellation invalidate old generations.
   const current=await db('GET',`stellar_push_devices?id=eq.${d.device_id}&generation=eq.${d.generation}&identity=eq.${d.recipient}&enabled=eq.true&select=id`) as unknown[];
   if(!current.length)state='cancelled';
   else await send(d,{id:d.letter_id,recipient:d.recipient,generation:d.generation,url:pushDestination(d.recipient,d.letter_id)});
  }catch(e){
   state='failed';const code=(e as {statusCode?:number}).statusCode;
   if(code===404||code===410)await db('PATCH',`stellar_push_devices?id=eq.${d.device_id}&generation=eq.${d.generation}`,{enabled:false,identity:null,endpoint:null,subscription:null,generation:d.generation+1});
  }
  await db('PATCH',`stellar_push_deliveries?letter_id=eq.${id}&device_id=eq.${d.device_id}&generation=eq.${d.generation}`,{state});
 }));
}
