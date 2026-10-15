import { describe, expect, it } from 'vitest';
import { makeHandler, type Database } from '../../supabase/functions/_shared/handler';
import { correct, digest, hex, validateSubmission, verifyPassword } from '../../supabase/functions/_shared/security';
import { questions } from '../experiences/compatibility/data';
import { coupleQuestions } from '../experiences/couple/data';
const origin='http://localhost:5173';
const id=()=>crypto.randomUUID();
async function fixture() {
 const password='Only-for-isolated-tests';
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const hash=hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},key,256)));
 const passwordHash=`pbkdf2-sha256$600000$${hex(salt)}$${hash}`;
 let clock=Date.now(); const sessions=new Map<string,{expires_at:string;credential_version:string}>();
 const rows: Record<string, Record<string,unknown>[]>={quiz_attempts:[],romantic_responses:[],wishes:[]};
 const limits=new Map<string,number>();
 const db: Database=async(method,path,input)=>{
  const body=input as Record<string,unknown>;
  if(path==='rpc/consume_rate_limit') {const bucket=String(body.bucket_name); const count=(limits.get(bucket)??0)+1;limits.set(bucket,count);return count<=Number(body.max_requests);}
  if(path==='rpc/admin_overview') return {quizzes:rows.quiz_attempts.length,wishes:rows.wishes.length,proposals:rows.romantic_responses.length};
  if(path.startsWith('admin_sessions')) {
   if(method==='POST'){sessions.set(String(body.token_hash),body as {expires_at:string;credential_version:string});return null;}
   const token=path.match(/token_hash=eq\.([a-f0-9]+)/)?.[1];
   if(method==='DELETE'){if(token)sessions.delete(token);return null;}
   return token && sessions.has(token)?[sessions.get(token)]:[];
  }
  const table=path.split('?')[0];
  if(method==='POST'){if(!rows[table].some(r=>r.submission_id===body.submission_id))rows[table].push({...body,id:id(),created_at:new Date(clock).toISOString()});return null;}
  return rows[table];
 };
 const settings={db,passwordHash,origins:[origin],now:()=>clock};
 const admin=makeHandler('admin',settings); const submit=makeHandler('submit',settings);
 const request=(body:unknown,token?:string)=>new Request('https://functions.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 const login=async()=>{const response=await admin(request({action:'login',username:'admin',password}));expect(response.status).toBe(200);return await response.json() as {token:string;expiresAt:string};};
 return {password,passwordHash,admin,submit,request,login,rows,sessions,limits,advance:()=>{clock+=16*60000;}};
}
describe('server authorization and consent',()=>{
 it('official answers and option IDs match the existing quizzes',()=>{
  expect(correct).toEqual(coupleQuestions.map(q=>q.correct));
  questions.forEach((q,i)=>expect(q.options.map(o=>o.id)).toEqual([0,1,2,3].map(j=>`${i}-${j}`)));
 });
 it('calculates true compatibility extremes and middle; ignores no client score',()=>{
  for(const [option,result] of [[3,25],[0,100],[2,50]]) expect(validateSubmission({kind:'compatibility',consent:true,submissionId:id(),answers:questions.map((_,i)=>`${i}-${option}`)}).row.result).toBe(result);
  expect(()=>validateSubmission({kind:'compatibility',consent:true,submissionId:id(),answers:[],result:100})).toThrow();
 });
 it('special answers never become officially correct',()=>{
  const answers=[...correct];answers[0]='B';
  expect(validateSubmission({kind:'couple',consent:true,submissionId:id(),answers}).row.result).toBe(9);
 });
 it('refusal, extra identification and invalid formats are rejected',()=>{
  const base={kind:'proposal',submissionId:id(),attempts:1,choice:'no'};
  expect(()=>validateSubmission(base)).toThrow();
  expect(()=>validateSubmission({...base,consent:true,ip:'unwanted'})).toThrow();
  expect(()=>validateSubmission({...base,consent:true,attempts:-1})).toThrow();
  expect(()=>validateSubmission({...base,consent:true,choice:'exit'})).toThrow();
  expect(()=>validateSubmission({kind:'wish',consent:true,submissionId:id(),text:'x'.repeat(2001)})).toThrow();
 });
 it('accepts wrong/correct password and enforces attempt limits',async()=>{
  const f=await fixture();
  expect((await f.admin(f.request({action:'login',username:'admin',password:'wrong'}))).status).toBe(401);
  const session=await f.login();expect(session.token).toMatch(/^[a-f0-9]{64}$/);expect(f.sessions.has(await digest(session.token))).toBe(true);
  for(let i=0;i<3;i++) await f.admin(f.request({action:'login',username:'admin',password:'wrong'}));
  expect((await f.admin(f.request({action:'login',username:'admin',password:f.password}))).status).toBe(429);
 });
 it('requires authentication, expires sessions, revokes on logout and password rotation',async()=>{
  const f=await fixture(); const body={action:'data',kind:'wish',page:0};
  expect((await f.admin(f.request(body))).status).toBe(401);
  const first=await f.login();expect((await f.admin(f.request(body,first.token))).status).toBe(200);
  expect((await f.admin(f.request({action:'logout'},first.token))).status).toBe(200);
  expect((await f.admin(f.request(body,first.token))).status).toBe(401);
  const second=await f.login();f.advance();expect((await f.admin(f.request(body,second.token))).status).toBe(401);
  const third=await f.login();f.sessions.get(await digest(third.token))!.credential_version='old';
  expect((await f.admin(f.request(body,third.token))).status).toBe(401);
 });
 it('authorized retries are idempotent, new attempts append, empty totals are real',async()=>{
  const f=await fixture();const session=await f.login();
  const initial=await (await f.admin(f.request({action:'data',kind:'couple',page:0},session.token))).json();
  expect(initial.overview).toEqual({quizzes:0,wishes:0,proposals:0});expect(initial.rows).toEqual([]);
  const body={kind:'couple',answers:correct,consent:true,submissionId:id()};
  expect((await f.submit(f.request(body))).status).toBe(201);await f.submit(f.request(body));
  expect(f.rows.quiz_attempts).toHaveLength(1);await f.submit(f.request({...body,submissionId:id()}));expect(f.rows.quiz_attempts).toHaveLength(2);
  expect((await f.submit(f.request({...body,consent:false,submissionId:id()}))).status).toBe(400);expect(f.rows.quiz_attempts).toHaveLength(2);
 });
 it('rejects unauthorized origins, excessive payloads and methods',async()=>{
  const f=await fixture();expect((await f.admin(new Request('https://x',{method:'POST',headers:{Origin:'https://evil.invalid'}}))).status).toBe(403);
  expect((await f.admin(new Request('https://x',{headers:{Origin:origin}}))).status).toBe(405);
  expect((await f.submit(f.request({text:'x'.repeat(9000)}))).status).toBe(413);
 });
 it('does not accept an unset or malformed password hash',async()=>{
  await expect(verifyPassword('test','')).rejects.toThrow();
 });
});
