import { makeUniverseHandler } from '../../supabase/functions/_shared/herUniverseHandler';
import { HttpError } from '../../supabase/functions/_shared/security';
import { validateDocument, type UniverseDocument } from '../../supabase/functions/_shared/herUniverseDomain';
import type { Database } from '../../supabase/functions/_shared/handler';
export const universeId='22222222-2222-4222-8222-222222222222';
export function readyDocument():UniverseDocument{
  return validateDocument({version:1,configuration:{generator:'spiral-v1'},galaxy:{version:1,accepted:true,created:true,stage:'ready',colors:['rosa','turquesa']},compatibility:{version:1,introSeen:true,status:'completed',questions:Array.from({length:5},(_,i)=>({id:`q${i}`,text:`Compatibilidade ${i+1}`,options:[1,2,3,4].map(weight=>({id:`q${i}-${weight}`,text:`Preferência ${weight}`,weight}))}))},couple:{version:1,introSeen:true,status:'completed',questions:Array.from({length:5},(_,i)=>({id:`c${i}`,text:`Casal ${i+1}`,comment:`Comentário ${i+1}`,options:[1,2,3,4].map(n=>({id:`c${i}-${n}`,text:`Resposta ${n}`,correct:n===2||n===4}))}))}});
}
// Network/UI fixture only. PostgreSQL security and scoring are tested separately against real SQL.
export function universeMock(origin='http://localhost:5175'){
  let universe:{id:string;revision:number;document:UniverseDocument;active_publication:string|null;created_at:string;updated_at:string}|null=null;
  const publications=new Map<string,{id:string;universeId:string;document:UniverseDocument}>(),attempts=new Map<string,{publication:string;kind:'couple'|'compatibility';index:number;points:number;responses:Map<number,{option:string;response:Record<string,unknown>}>}>();
  let networkError=false,limited=false;
  const db:Database=async(method,path,input)=>{
    if(networkError)throw new Error('Network');const body=input as Record<string,unknown>;
    if(path==='rpc/her_consume_rate_limit')return !limited;
    if(method==='GET'&&path.startsWith('her_universes?'))return universe?[{id:universe.id,revision:universe.revision,active_publication:universe.active_publication}]:[];
    if(path==='rpc/her_publish_gift'){
      const document=structuredClone(body.p_document) as UniverseDocument;
      if(universe&&JSON.stringify(universe.document)===JSON.stringify(document)&&universe.active_publication)return {id:universe.active_publication,universeId,revision:universe.revision};
      if(body.p_revision!==(universe?.revision??0))throw new HttpError(409,'Conflito: atualize a revisão publicada.');
      if(!universe)universe={id:universeId,revision:1,document,active_publication:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      else{universe.document=document;universe.revision++;}
      const id=crypto.randomUUID();publications.set(id,{id,universeId,document});universe.active_publication=id;return {id,universeId,revision:universe.revision};
    }
    if(path==='rpc/her_read_publication')return universe?.active_publication&&(!body.p_universe||body.p_universe===universe.id)?publications.get(universe.active_publication):null;
    if(path==='rpc/her_start_attempt'){
      const pub=publications.get(String(body.p_publication));const kind=body.p_kind as 'couple'|'compatibility';if(!pub||pub.document[kind].status!=='completed')throw new HttpError(400,'Unavailable');
      attempts.set(String(body.p_hash),{publication:pub.id,kind,index:0,points:0,responses:new Map()});return {started:true};
    }
    if(path==='rpc/her_answer'){
      const a=attempts.get(String(body.p_hash));if(!a)throw new HttpError(400,'Expired');const index=Number(body.p_index);const prior=a.responses.get(index);if(prior&&prior.option===body.p_option)return prior.response;
      if(a.index!==index)throw new HttpError(409,'Confirme em ordem.');
      const questions=publications.get(a.publication)!.document[a.kind].questions,q=questions[index],o=q?.options.find(o=>o.id===body.p_option);if(!o)throw new HttpError(400,'Invalid option');
      a.points+=a.kind==='couple'?Number(o.correct):o.weight!;
      const response:Record<string,unknown>={confirmed:true,...(a.kind==='couple'?{correct:o.correct,comment:q.comment,correctOptions:q.options.filter(o=>o.correct).map(o=>({id:o.id,text:o.text}))}:{})};
      if(index===questions.length-1)response.result=Math.round(a.points/(questions.length*(a.kind==='compatibility'?4:1))*100);
      a.responses.set(index,{option:String(body.p_option),response});a.index++;return response;
    }
    throw new Error(`Unexpected mocked path ${path}`);
  };
  const handler=makeUniverseHandler({db,origins:[origin]});
  const request=(body:unknown,credential?:string)=>handler(new Request('https://mock.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(credential?{Authorization:`Bearer ${credential}`}:{})},body:JSON.stringify(body)}));
  return {handler,request,db,get universe(){return universe;},publications,setNetworkError:(value:boolean)=>{networkError=value;},setLimited:(value:boolean)=>{limited=value;}};
}
