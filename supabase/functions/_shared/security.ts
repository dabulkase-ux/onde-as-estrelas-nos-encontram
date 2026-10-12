export const correct = ['A','C','A','A','B','C','C','C','A','B'];
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function validateSubmission(body: Record<string, unknown>) {
 if (body.consent !== true) throw new HttpError(400, 'O envio exige autorização explícita.');
 if(typeof body.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submissionId)) throw new HttpError(400,'Identificador de envio inválido.');
 const base = {submission_id:body.submissionId, consent_version:1};
 const allowed = ['kind','consent','submissionId'];
 let result: {table: string; row: Record<string,unknown>};
 if(body.kind==='compatibility' || body.kind==='couple') {
  allowed.push('answers');
  if(!Array.isArray(body.answers) || body.answers.length!==10 || body.answers.some((a,i)=>typeof a!=='string' || (body.kind==='couple' ? !/^[ABCD]$/.test(a) : !new RegExp(`^${i}-[0-3]$`).test(a)))) throw new HttpError(400,'Respostas inválidas.');
  const score = body.kind==='couple' ? body.answers.filter((a,i)=>a===correct[i]).length : body.answers.reduce((sum,a)=>sum+4-Number(a.split('-')[1]),0)*2.5;
  result = {table:'quiz_attempts',row:{...base,quiz_type:body.kind,answers:body.answers,result:score,completed:true}};
 } else if(body.kind==='proposal') {
  allowed.push('attempts','choice');
  if(!Number.isSafeInteger(body.attempts) || Number(body.attempts)<0 || Number(body.attempts)>100000 || !['yes','no','later'].includes(String(body.choice))) throw new HttpError(400,'Resposta inválida.');
  result = {table:'romantic_responses',row:{...base,attempts:body.attempts,choice:body.choice}};
 } else if(body.kind==='wish') {
  allowed.push('text');
  if(typeof body.text!=='string' || body.text.trim().length<1 || body.text.length>2000 || Array.from(body.text).some(c=>c.charCodeAt(0)<32 && ![9,10,13].includes(c.charCodeAt(0)))) throw new HttpError(400,'O desejo deve ter entre 1 e 2000 caracteres.');
  result = {table:'wishes',row:{...base,text:body.text.trim()}};
 } else throw new HttpError(400,'Tipo de envio inválido.');
 if(Object.keys(body).some(key=>!allowed.includes(key))) throw new HttpError(400,'Campos não permitidos.');
 return result;
}
export const hex = (bytes: Uint8Array) => Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))); }
export async function verifyPassword(password: unknown, encoded: string) {
 if(typeof password!=='string' || password.length<1 || password.length>256) return false;
 const [scheme, rounds, salt, expected] = encoded.split('$');
 if(scheme!=='pbkdf2-sha256' || rounds!=='600000' || !/^[a-f0-9]{32}$/.test(salt??'') || !/^[a-f0-9]{64}$/.test(expected??'')) throw new HttpError(503,'Autenticação ainda não configurada.');
 const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bytes = Uint8Array.from(salt.match(/../g)!,v=>parseInt(v,16));
 const actual = hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes,iterations:600000},key,256)));
 let difference = 0; for(let i=0;i<expected.length;i++) difference |= expected.charCodeAt(i)^actual.charCodeAt(i);
 return difference===0;
}
