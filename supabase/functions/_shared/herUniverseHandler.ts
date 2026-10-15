import { digest, hex, HttpError } from './security.ts';
import { publicPublication, validateDocument } from './herUniverseDomain.ts';
import type { Database } from './handler.ts';
export type UniverseSettings={db:Database;origins:string[]};
const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function makeUniverseHandler(settings:UniverseSettings){
  return async(request:Request)=>{
    const origin=request.headers.get('origin')??'';
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(settings.origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
    const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
    try{
      if(!settings.origins.length)throw new HttpError(503,'Serviço ainda não configurado.');
      if(!settings.origins.includes(origin))throw new HttpError(403,'Origem não autorizada.');
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
      if(request.method!=='POST')throw new HttpError(405,'Método não permitido.');
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'Envie JSON.');
      const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
      if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_200_000){await reader.cancel();throw new HttpError(413,'Dados muito grandes.');}chunks.push(value);}}finally{reader.releaseLock();}}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const raw=new TextDecoder().decode(bytes);
      let body:Record<string,unknown>;try{body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();}catch{throw new HttpError(400,'Dados inválidos.');}
      const actions:Record<string,string[]>={public:['universeId'],owner:[],publish:['revision','document'],start:['publicationId','kind'],answer:['attempt','index','optionId']};
      if(typeof body.action!=='string'||!actions[body.action]||Object.keys(body).some(k=>k!=='action'&&!actions[String(body.action)].includes(k)))throw new HttpError(400,'Campos não permitidos.');
      const action=body.action;
      const ip=await digest(request.headers.get('x-forwarded-for')?.split(',')[0]??'unknown');
      if(!await settings.db('POST','rpc/her_consume_rate_limit',{bucket_name:`her:${action}:${ip}`,max_requests:action==='publish'?10:action==='start'?20:120,window_seconds:60}))throw new HttpError(429,'Aguarde um pouco antes de tentar novamente.');
      if(action==='public'){
        if(body.universeId!==undefined&&!uuid(body.universeId))throw new HttpError(400,'Universo inválido.');
        const row=await settings.db('POST','rpc/her_read_publication',{p_universe:body.universeId??null}) as {id:string;universeId:string;document:unknown}|null;
        return respond({publication:row?publicPublication(row.id,row.universeId,row.document):null});
      }
      if(action==='start'){
        if(!uuid(body.publicationId)||!['couple','compatibility'].includes(String(body.kind)))throw new HttpError(400,'Experiência inválida.');
        const token=hex(crypto.getRandomValues(new Uint8Array(32)));
        await settings.db('POST','rpc/her_start_attempt',{p_publication:body.publicationId,p_kind:body.kind,p_hash:await digest(token)});
        return respond({attempt:token});
      }
      if(action==='answer'){
        if(typeof body.attempt!=='string'||!/^[a-f0-9]{64}$/.test(body.attempt)||!Number.isSafeInteger(body.index)||Number(body.index)<0||typeof body.optionId!=='string'||body.optionId.length>100)throw new HttpError(400,'Resposta inválida.');
        return respond(await settings.db('POST','rpc/her_answer',{p_hash:await digest(body.attempt),p_index:body.index,p_option:body.optionId}));
      }
      if(action==='owner'){
        const rows=await settings.db('GET','her_universes?owner_id=is.null&slug=eq.universo-dela&select=id,revision,active_publication') as unknown[];
        return respond({universe:rows[0]??null});
      }
      if(!Number.isSafeInteger(body.revision)||Number(body.revision)<0)throw new HttpError(400,'Versão inválida.');
      let doc;try{doc=validateDocument(body.document);}catch(error){throw new HttpError(400,error instanceof Error?error.message:'Dados inválidos.');}
      if(!doc.galaxy.created)throw new HttpError(400,'Crie sua galáxia antes de publicar.');
      for(const kind of ['compatibility','couple'] as const)if(doc[kind].status!=='completed')doc[kind]={version:1,introSeen:false,status:'draft',questions:[]};
      return respond({publication:await settings.db('POST','rpc/her_publish_gift',{p_revision:body.revision,p_document:doc})});
    }catch(error){return respond({error:error instanceof HttpError?error.message:'O serviço não pôde concluir. Seu rascunho local foi preservado.'},error instanceof HttpError?error.status:503);}
  };
}
