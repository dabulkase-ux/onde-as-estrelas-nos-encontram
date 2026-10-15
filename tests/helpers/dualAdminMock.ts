import { makeHandler, type Database } from '../../supabase/functions/_shared/handler';
import { digest, hex } from '../../supabase/functions/_shared/security';
export async function dualAdminMock(origin='http://localhost:5174'){
  const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('audit-fixture-password-only'),'PBKDF2',false,['deriveBits']);
  const hash=`pbkdf2-sha256$600000$${hex(salt)}$${hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},key,256)))}`;
  let clock=Date.now();const sessions=new Map<string,Record<string,unknown>>();const calls:string[]=[];
  const original={id:'original-attempt',created_at:'2026-10-13T12:00:00Z',completed:true,result:100,answers:Array.from({length:10},(_,i)=>`${i}-0`)};
  const received={id:'her-couple-attempt',created_at:'2026-10-13T13:00:00Z',completed:true,result:75,score:3,total:4,answers:['one-a','two-c','three-b','four-c'],questions:['one','two','three','four'].map((id,index)=>({id,text:`Pergunta dela ${index+1}`,comment:'Comentário da criadora',options:['a','b','c','d'].map((letter,i)=>({id:`${id}-${letter}`,text:`Alternativa dela ${letter.toUpperCase()}`,correct:index===2?i===0:i===(index===0?0:2)}))}))};
  const compatibility={...received,id:'her-compatibility-attempt',result:63,score:10,answers:['one-b','two-b','three-d','four-b'],questions:received.questions.map(q=>({...q,options:q.options.map((o,index)=>({...o,weight:index+1}))}))};
  const db:Database=async(method,path,input)=>{
    calls.push(path);const body=input as Record<string,unknown>;
    if(path==='rpc/consume_rate_limit')return true;
    if(path.startsWith('admin_sessions')){
      if(method==='POST'){sessions.set(String(body.token_hash),body);return null;}
      if(path.includes('expires_at=lte'))return null;
      const token=path.match(/token_hash=eq\.([a-f0-9]+)/)?.[1];if(method==='DELETE'){if(token)sessions.delete(token);return null;}
      return token&&sessions.has(token)?[sessions.get(token)]:[];
    }
    if(path==='rpc/admin_overview')return {quizzes:1,wishes:1,proposals:1};
    if(path==='rpc/her_admin_overview')return {quizzes:2,wishes:0,proposals:0};
    if(path==='rpc/her_admin_records')return Number(body.p_offset)>0?[]:[body.p_kind==='couple'?received:compatibility];
    if(path.startsWith('quiz_attempts?'))return [original];
    if(path.startsWith('wishes?'))return [{id:'original-wish',created_at:original.created_at,text:'Desejo privado original'}];
    if(path.startsWith('romantic_responses?'))return [{id:'original-proposal',created_at:original.created_at,choice:'yes',attempts:2}];
    throw new Error('Unknown mock operation');
  };
  const handler=makeHandler('admin',{db,passwordHash:hash,herPasswordHash:hash,origins:[origin],now:()=>clock});
  const request=(body:unknown,token?:string)=>handler(new Request('https://mock.invalid/admin',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)}));
  return {handler,request,sessions,calls,hash,received,compatibility,advance:()=>{clock+=16*60000;},sessionKey:digest};
}
