import { digest, hex, HttpError, validateSubmission, verifyPassword } from './security.ts';
export type Database = (method: string, path: string, body?: unknown) => Promise<unknown>;
export interface Settings {origins: string[]; passwordHash: string; herPasswordHash?: string; db: Database; now?: () => number}
const tables: Record<string,string> = {compatibility:'quiz_attempts',couple:'quiz_attempts',proposal:'romantic_responses',wish:'wishes'};
export function makeHandler(mode: 'admin' | 'submit', settings: Settings) {
 return async (request: Request) => {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = settings.origins.includes(origin);
  const headers = new Headers({'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'});
  if(allowed) { headers.set('Access-Control-Allow-Origin',origin); headers.set('Access-Control-Allow-Headers','authorization, apikey, content-type'); headers.set('Access-Control-Allow-Methods','POST, OPTIONS'); }
  const reply = (body: unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
  const now = settings.now ?? Date.now;
  try {
   if(!allowed) throw new HttpError(403,'Origem não permitida.');
   if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
   if(request.method!=='POST') throw new HttpError(405,'Método não permitido.');
   if(!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415,'Envie JSON.');
   // Limite aplicado durante a leitura, inclusive para bodies sem Content-Length.
   const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let length=0;
   if(reader) { try { while(true) {const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>8192){await reader.cancel();throw new HttpError(413,'Envio muito grande.');}chunks.push(value);} } finally {reader.releaseLock();} }
   const bytes = new Uint8Array(length); let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   let body: Record<string,unknown>;
   try {body=JSON.parse(new TextDecoder().decode(bytes));} catch {throw new HttpError(400,'JSON inválido.');}
   if(!body || typeof body!=='object' || Array.isArray(body)) throw new HttpError(400,'Envio inválido.');
   const rate = async (bucket: string, limit: number, seconds: number) => {
    const accepted = await settings.db('POST','rpc/consume_rate_limit',{bucket_name:bucket,max_requests:limit,window_seconds:seconds});
    if(accepted!==true) {headers.set('Retry-After',String(seconds));throw new HttpError(429,'Muitas tentativas. Aguarde alguns minutos e tente novamente.');}
   };
   if(mode==='submit') {
    await rate('public-submit',30,60);
    const {table,row}=validateSubmission(body);
    // ID do registro e data são criados pelo banco. submission_id só deduplica retries.
    await settings.db('POST',`${table}?on_conflict=submission_id`,row);
    return reply({ok:true},201);
   }
   const credential=(username:string)=>username==='admin'?settings.passwordHash:settings.herPasswordHash??'';
   if(body.action==='login') {
    await rate('admin-login',5,300);
    if(Object.keys(body).some(key=>!['action','username','password'].includes(key)))throw new HttpError(400,'Campos não permitidos.');
    const username=body.username===undefined?'admin':typeof body.username==='string'?body.username:'';
    const known=['admin','meu-universo-dela'].includes(username);
    const hash=credential(username);
    const valid=hash?await verifyPassword(body.password,hash):false;
    if(!known||!valid)throw new HttpError(401,'Usuário ou senha incorretos.');
    const token=hex(crypto.getRandomValues(new Uint8Array(32)));
    const expiresAt=new Date(now()+15*60*1000).toISOString();
    await settings.db('DELETE',`admin_sessions?expires_at=lte.${encodeURIComponent(new Date(now()).toISOString())}`);
    await settings.db('POST','admin_sessions',{token_hash:await digest(token),credential_version:await digest(`${username}:${hash}`),username,expires_at:expiresAt});
    return reply({token,expiresAt,username});
   }
   const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
   if(!token) throw new HttpError(401,'Sessão necessária.');
   const tokenHash=await digest(token);
   const sessions=await settings.db('GET',`admin_sessions?token_hash=eq.${tokenHash}&select=expires_at,credential_version,username`) as {expires_at:string;credential_version:string;username:string}[];
   const session=sessions[0];
   if(!session || Date.parse(session.expires_at)<=now() || !['admin','meu-universo-dela'].includes(session.username)||session.credential_version!==await digest(`${session.username}:${credential(session.username)}`)) throw new HttpError(401,'Sua sessão expirou. Entre novamente.');
   if(Object.keys(body).some(key=>!['action','kind','page'].includes(key)))throw new HttpError(400,'Campos não permitidos.');
   if(body.action==='logout') {await settings.db('DELETE',`admin_sessions?token_hash=eq.${tokenHash}`);return reply({ok:true});}
   if(body.action!=='data' || typeof body.kind!=='string' || !Object.hasOwn(tables,body.kind) || !Number.isSafeInteger(body.page) || Number(body.page)<0 || Number(body.page)>100000) throw new HttpError(400,'Consulta inválida.');
   await rate('admin-read',120,60);
   if(session.username==='meu-universo-dela'){
    const overview=await settings.db('POST','rpc/her_admin_overview',{});
    if(body.kind==='wish'||body.kind==='proposal')return reply({overview,rows:[],hasMore:false});
    const rows=await settings.db('POST','rpc/her_admin_records',{p_kind:body.kind,p_offset:Number(body.page)*50}) as unknown[];
    return reply({overview,rows:rows.slice(0,50),hasMore:rows.length>50});
   }
   const filter=body.kind==='compatibility'||body.kind==='couple'?`&quiz_type=eq.${body.kind}`:'';
   const [overview, rows]=await Promise.all([
    settings.db('POST','rpc/admin_overview',{}),
    settings.db('GET',`${tables[body.kind]}?select=*&order=created_at.desc,id.desc&limit=51&offset=${Number(body.page)*50}${filter}`),
   ]);
   const records=rows as unknown[];
   return reply({overview,rows:records.slice(0,50),hasMore:records.length>50});
  } catch(error) {
   if(error instanceof HttpError) return reply({error:error.message},error.status);
   // Nunca registrar body, senha, token, desejo ou credenciais.
   return reply({error:'Serviço indisponível. Verifique a configuração e tente novamente.'},503);
  }
 };
}
