import { useEffect, useRef, useState } from 'react';
import { ApiError, invoke, savingAvailable } from '../services/supabase';
import { questions } from '../experiences/compatibility/data';
import { coupleQuestions, letters } from '../experiences/couple/data';
import './admin.css';
import {readAdminSession,storeAdminSession,type AdminSession} from './session';
type Kind = 'compatibility' | 'couple' | 'proposal' | 'wish';
type ReceivedQuestion={id:string;text:string;options:{id:string;text:string;correct?:boolean;weight?:number}[]};
type Row = {questions?:ReceivedQuestion[];score?:number;total?:number;id: string; created_at: string; answers?: string[]; result?: number; completed?: boolean; attempts?: number; choice?: string; text?: string};
type Overview = {quizzes: number; wishes: number; proposals: number};
const labels: Record<Kind, string> = {compatibility:'Quiz de compatibilidade',couple:'Quiz de casal',proposal:'Pedido romântico',wish:'Desejos'};
export default function Admin() {
 const [session, setSession] = useState<AdminSession|null>(readAdminSession);
 const [username,setUsername]=useState(()=>session?.username??'admin');
 const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 const [overview, setOverview] = useState<Overview | null>(null); const [kind, setKind] = useState<Kind>('compatibility');
 const [rows, setRows] = useState<Row[]>([]); const [page, setPage] = useState(0); const [hasMore, setHasMore] = useState(false);
 const heading = useRef<HTMLHeadingElement>(null); const passwordInput = useRef<HTMLInputElement>(null); const request = useRef(0);
 useEffect(() => { heading.current?.focus(); }, [session?.token]);
 useEffect(()=>storeAdminSession(session),[session]);
 useEffect(() => {
  if (!session) return;
  const timer = setTimeout(() => { request.current++; setSession(null); setRows([]); setOverview(null); setBusy(false); setError('Sua sessão expirou. Entre novamente.'); }, Math.max(0, Date.parse(session.expiresAt)-Date.now()));
  return () => clearTimeout(timer);
 }, [session]);
 useEffect(() => {
  if (!session) return;
  let live = true; const version = ++request.current;
  setBusy(true); setError(''); setRows([]);
  invoke<{overview: Overview; rows: Row[]; hasMore: boolean}>('admin',{action:'data',kind,page},session.token)
   .then(data => { if(live && version === request.current) { setOverview(data.overview); setRows(data.rows); setHasMore(data.hasMore); } })
   .catch(e => { if(live && version === request.current) { if(e instanceof ApiError && e.status===401) { setSession(null); setOverview(null); } setError(e instanceof Error ? e.message : 'Falha ao carregar.'); } })
   .finally(() => { if(live && version === request.current) setBusy(false); });
  return () => {live=false;};
 }, [session,kind,page]);
 const login = async (event: React.FormEvent) => {
  event.preventDefault(); if(busy) return; setBusy(true); setError('');
  const secret = password; setPassword('');
  try { const next = await invoke<AdminSession>('admin',{action:'login',username,password:secret}); setSession({...next,username}); setPage(0); }
  catch(e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.'); passwordInput.current?.focus(); }
  finally { setBusy(false); }
 };
 const logout = async () => {
  if(!session || busy) return; setBusy(true); setError('');
  try { await invoke('admin',{action:'logout'},session.token); request.current++; setSession(null); setRows([]); setOverview(null); }
  catch { setError('Não foi possível encerrar a sessão no servidor. Tente novamente; ela expira em até 15 minutos.'); }
  finally { setBusy(false); }
 };
 return <main className="admin-page"><div className="admin-shell">
  <header><p>Meu Universo</p><h1 ref={heading} tabIndex={-1}>Painel administrativo</h1>{session && <button disabled={busy} onClick={logout}>Sair</button>}</header>
  {!savingAvailable && <p role="status">Supabase ainda não configurado. Consulte SUPABASE.md para preparar o ambiente.</p>}
  {error && <p role="alert" className="admin-error">{error}</p>}
  {!session ? <form onSubmit={login}><label htmlFor="admin-username">Usuário</label><input id="admin-username" type="text" autoComplete="username" required maxLength={40} value={username} onChange={e=>setUsername(e.target.value)}/><label htmlFor="admin-password">Senha</label><input ref={passwordInput} id="admin-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy || !savingAvailable}>{busy?'Entrando...':'Entrar'}</button></form> : <>
   <section aria-label="Visão geral" className="admin-counts">{overview && <><p>Quizzes enviados<strong>{overview.quizzes}</strong></p><p>Desejos enviados<strong>{overview.wishes}</strong></p><p>Respostas ao pedido<strong>{overview.proposals}</strong></p></>}</section>
   <nav aria-label="Registros">{(Object.keys(labels) as Kind[]).map(k=><button key={k} aria-pressed={kind===k} onClick={()=>{setKind(k);setPage(0);}}>{labels[k]}</button>)}</nav>
   <h2>{labels[kind]}</h2>
   {busy ? <p role="status">Carregando...</p> : !error && rows.length===0 ? <p>Nenhum registro ainda</p> : rows.map(row=><article className="admin-record" key={row.id}><p>{row.created_at?<time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('pt-BR')}</time>:'Data não registrada'}</p><small>Tentativa: {row.id}</small>
    {row.answers && <><p>{kind==='compatibility'?'Afinidade de preferências':'Respostas oficiais selecionadas'}: {row.questions&&kind==='couple'?`${row.score}/${row.total} — ${row.result}%`:`${row.result}${kind==='compatibility'?'%':'/10'}`} · {row.completed?'Concluído':'Incompleto'}</p><ol>{row.answers.map((answer,i)=>{
     const q = row.questions?.[i]??(kind==='compatibility'?questions[i]:coupleQuestions[i]);
     const received=row.questions?.[i];
     const text = received?received.options.find(o=>o.id===answer)?.text:kind==='compatibility'?questions[i]?.options.find(o=>o.id===answer)?.text:coupleQuestions[i]?.options[letters.indexOf(answer as typeof letters[number])];
     return <li key={i}><p>{q?.text}</p><p>{received?String.fromCharCode(65+received.options.findIndex(o=>o.id===answer)):answer}: {text??'Alternativa desconhecida'}</p>{received&&<p>{kind==='couple'?'Respostas corretas: ':'Pesos das alternativas: '}{received.options.filter(o=>kind==='compatibility'||o.correct).map(o=>`${String.fromCharCode(65+received.options.indexOf(o))}. ${o.text}${kind==='compatibility'?` (${o.weight})`:''}`).join(' · ')}</p>}</li>;
    })}</ol></>}
    {row.choice && <><p>Resposta: {({yes:'Sim',no:'Não',later:'Deixar para depois'} as Record<string,string>)[row.choice]}</p><p>Tentativas no botão Não: {row.attempts}</p></>}
    {row.text && <p className="admin-wish">{row.text}</p>}
   </article>)}
   <div className="admin-pagination"><button disabled={busy || page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1}</span><button disabled={busy || !hasMore} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
  </>}
  <a href="/">Voltar ao universo</a>
 </div></main>;
}
