import {localDocument,remoteRepository,type RemoteUniverse} from './repository';
import {localUniverseChangeEvent} from '../localChange';
export const syncStatusEvent='meu-universo:remote-sync-status';
const bindingKey='meu-universo.remote-cache-binding.v1';
type Binding={id:string;revision:number;fingerprint:string};
type State={remote:RemoteUniverse|null;status:'local'|'pending'|'syncing'|'synced'|'error';message:string};
let state:State={remote:null,status:'local',message:''},started=false,working=false;
const emit=(next:Partial<State>)=>{state={...state,...next};window.dispatchEvent(new Event(syncStatusEvent));};
const fingerprint=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
const binding=():Binding|null=>{try{return JSON.parse(localStorage.getItem(bindingKey)??'null');}catch{return null;}};
export const creatorSync={
 get:()=>state,
 async refresh(){
  const result=await remoteRepository.owner();const previous=binding();let status:State['status']='local';
  if(result.universe){try{status=previous?.id===result.universe.id&&previous.revision===result.universe.revision&&previous.fingerprint===await fingerprint(localDocument())?'synced':'pending';}catch{status='local';}}
  emit({remote:result.universe,status,message:''});return result;
 },
 async publishNow(){
  if(working)throw new Error('A publicação já está em andamento.');working=true;
  try{
   if(!state.remote)await creatorSync.refresh();
   const snapshot=localDocument();emit({status:'syncing',message:''});
   const result=await remoteRepository.publish(state.remote?.revision??0,snapshot);
   const remote={id:result.publication.universeId,revision:result.publication.revision,active_publication:result.publication.id};
   try{localStorage.setItem(bindingKey,JSON.stringify({...remote,fingerprint:await fingerprint(snapshot)}));}catch{/* The remote publication is confirmed even when browser storage fails. */}
   emit({remote,status:await fingerprint(localDocument())===await fingerprint(snapshot)?'synced':'pending',message:'Universo publicado. Rascunhos não concluídos permanecem neste navegador.'});return result.publication;
  }catch(error){emit({status:'error',message:error instanceof Error?error.message:'A publicação falhou. Seu backup local foi preservado.'});throw error;}
  finally{working=false;}
 },
 start(){
  if(started)return;started=true;
  window.addEventListener(localUniverseChangeEvent,()=>emit({status:'pending',message:'Alterações mantidas no navegador até você publicar.'}));
  window.addEventListener('online',()=>{if(!working)void creatorSync.refresh().catch(error=>emit({status:'error',message:error.message}));});
  void creatorSync.refresh().catch(error=>emit({status:'error',message:error instanceof Error?error.message:'Não foi possível verificar a publicação.'}));
 },
};
