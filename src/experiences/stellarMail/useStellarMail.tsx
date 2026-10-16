import {mailRetryDelay} from './polling';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ApiError} from '../../services/supabase';
import {clearLegacyMailSession,mailRequest,type MailActor,type StellarLetter} from './repository';
import {MailPanel} from './MailPanel';
import type {MailSceneInput} from '../../graphics/stellarPostbox';
import './stellarMail.css';
type Mailbox={actor?:MailActor;rows:StellarLetter[];hasMore:boolean;unread:number};
const emptyBox:Mailbox={rows:[],hasMore:false,unread:0};

export function useStellarMail(active:boolean,origin:MailActor,open:boolean,onOpen:(value:boolean)=>void){
 const [folder,setFolder]=useState<'received'|'sent'>('received'),[page,setPage]=useState(0);
 const [box,setBox]=useState<Mailbox>(emptyBox),[error,setError]=useState(''),[arrival,setArrival]=useState('');
 const target=useRef<HTMLButtonElement>(null),requesting=useRef<string|null>(null),sequence=useRef(0),view=useRef(''),identity=useRef(origin),retry=useRef({failures:0,next:0});
 identity.current=origin;view.current=`${origin}:${folder}:${page}`;
 const visibleBox=box.actor===origin?box:emptyBox;
 useEffect(()=>clearLegacyMailSession(),[]);
 useEffect(()=>{retry.current={failures:0,next:0};setBox(emptyBox);setArrival('');setFolder('received');setPage(0);setError('');},[origin]);
 const problem=useCallback((e:unknown)=>{setError(e instanceof Error?e.message:'As estrelas não responderam. Tente novamente.');if(e instanceof ApiError&&(e.status===401||e.status===403)){setBox(emptyBox);setArrival('');}},[]);
 const refresh=useCallback(async(force=false)=>{
  const currentView=`${origin}:${folder}:${page}`;
  if((!force&&Date.now()<retry.current.next)||requesting.current===currentView)return false;
  requesting.current=currentView;const request=++sequence.current;
  try{const next=await mailRequest<Mailbox>({action:'mailbox',universe:origin,folder,page});
   if(identity.current!==origin||view.current!==currentView||sequence.current!==request)return false;
   if(next.actor!==origin)throw new ApiError('A resposta não corresponde a esta galáxia.',403);
   retry.current={failures:0,next:0};setBox(next);setError('');return true;
  }catch(e){if(identity.current===origin&&sequence.current===request){retry.current.failures++;retry.current.next=Date.now()+mailRetryDelay(retry.current.failures);problem(e);}return false;}
  finally{if(sequence.current===request)requesting.current=null;}
 },[origin,folder,page,problem]);
 useEffect(()=>{if(!active)return;let stopped=false;
  const tick=async()=>{if(document.hidden||stopped)return;const refreshed=await refresh();if(refreshed&&!open&&!stopped&&identity.current===origin)try{const a=await mailRequest<{id:string|null}>({action:'arrival',universe:origin});if(!stopped&&identity.current===origin&&a.id)setArrival(a.id);}catch(e){if(!stopped){retry.current.failures++;retry.current.next=Date.now()+mailRetryDelay(retry.current.failures);problem(e);}}};
  void tick();const timer=setInterval(()=>void tick(),5000);const wake=()=>void tick();window.addEventListener('focus',wake);window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',wake);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
 },[active,origin,open,refresh,problem]);
 const mutate=async(action:string,payload:Record<string,unknown>)=>{
  try{const result=await mailRequest<StellarLetter>({action,universe:origin,...payload});if(identity.current!==origin)throw new Error('A galáxia mudou.');await refresh(true);return result;}catch(e){if(identity.current===origin)problem(e);throw e;}
 };
 const project=useCallback((p:{x:number;y:number;visible:boolean})=>{if(target.current){target.current.dataset.onscreen=String(p.visible);target.current.style.setProperty('--mail-label-shift',`${Math.max(0,70-p.x)+Math.min(0,window.innerWidth-70-p.x)}px`);target.current.style.setProperty('--mail-x',`${p.x}px`);target.current.style.setProperty('--mail-y',`${p.y}px`);}},[]);
 const reveal=useCallback(()=>onOpen(true),[onOpen]);
 const scene:MailSceneInput=useMemo(()=>({visible:active&&!open,unread:visibleBox.unread,arrival,onOpen:reveal,onProject:project}),[active,open,visibleBox.unread,arrival,reveal,project]);
 const overlay=active?<><button ref={target} className="stellar-mail-target" onClick={reveal} aria-label={`Correio Estelar${visibleBox.unread?`, ${visibleBox.unread} não lidas`:''}`}><svg viewBox="0 0 60 44" aria-hidden="true"><rect x="4" y="5" width="52" height="34" rx="3"/><path d="M5 7 30 25 55 7 M5 37 22 23 M55 37 38 23"/></svg><span>Correio Estelar{visibleBox.unread>0&&<b>{visibleBox.unread}</b>}</span></button>{open&&<MailPanel key={origin} origin={origin} box={visibleBox} folder={folder} page={page} error={error} onClose={()=>onOpen(false)} onFolder={value=>{setFolder(value);setPage(0);}} onPage={setPage} onRefresh={async()=>{await refresh(true);}} onMutate={mutate}/>}</>:null;
 return {scene,overlay};
}
