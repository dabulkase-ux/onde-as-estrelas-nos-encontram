import {type Settings} from './handler.ts';
import {HttpError} from './security.ts';
export type MailActor='arthur'|'carol';
export type StellarLetter={id:string;sender:MailActor;recipient:MailActor;title:string;content:string;created_at:string;updated_at:string;read_at:string|null;noticed_at:string|null;revision:number};
const fields:Record<string,string[]>={mailbox:['folder','page'],send:['id','title','content'],edit:['id','revision','title','content'],delete:['id','revision'],read:['id','revision'],arrival:[]};
export function makeStellarMailHandler(settings:Pick<Settings,'db'|'origins'>){
 return async(request:Request)=>{
  const origin=request.headers.get('origin')??'',allowed=settings.origins.includes(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(allowed?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Max-Age':'600'};
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  try{
   if(!allowed)throw new HttpError(403,'Origem não permitida.');
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(request.method!=='POST')throw new HttpError(405,'Método não permitido.');
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Envie JSON.');
   const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
   if(reader)try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>100_000){await reader.cancel();throw new HttpError(413,'Carta muito extensa.');}chunks.push(value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
   let body:Record<string,unknown>;try{body=JSON.parse(new TextDecoder().decode(bytes));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{throw new HttpError(400,'Dados inválidos.');}
   const action=String(body.action);if(!Object.hasOwn(fields,action)||Object.keys(body).some(k=>k!=='action'&&k!=='universe'&&!fields[action].includes(k)))throw new HttpError(400,'Campos não permitidos.');
   const actor=body.universe;if(actor!=='arthur'&&actor!=='carol')throw new HttpError(400,'Galáxia inválida.');
   if(await settings.db('POST','rpc/stellar_mail_rate_limit',{bucket_name:`stellar-mail:${actor}`,max_requests:120,window_seconds:60})!==true)throw new HttpError(429,'Aguarde um instante antes de tentar novamente.');
   if(['send','edit','delete','read'].includes(action)&&!(typeof body.id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.id)))throw new HttpError(400,'Carta inválida.');
   if(['edit','delete','read'].includes(action)&&(!Number.isSafeInteger(body.revision)||Number(body.revision)<1))throw new HttpError(400,'Revisão inválida.');
   if(['send','edit'].includes(action)&&(typeof body.title!=='string'||body.title.length>200||typeof body.content!=='string'||!body.content.trim()||body.content.length>20_000))throw new HttpError(400,'Escreva uma mensagem de até 20.000 caracteres e um título de até 200.');
   if(action==='mailbox'&&(!['received','sent'].includes(String(body.folder))||!Number.isSafeInteger(body.page)||Number(body.page)<0||Number(body.page)>1_000_000))throw new HttpError(400,'Página inválida.');
   const {action:_action,universe:_universe,...payload}=body;void _action;void _universe;
   return reply(await settings.db('POST','rpc/stellar_mail',{p_actor:actor,p_action:action,p_payload:payload}));
  }catch(error){return reply({error:error instanceof HttpError?error.message:'Não foi possível abrir o correio. Sua mensagem não foi descartada.'},error instanceof HttpError?error.status:503);}
 };
}
