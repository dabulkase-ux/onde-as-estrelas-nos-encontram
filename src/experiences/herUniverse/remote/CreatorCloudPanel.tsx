import {useEffect,useRef,useState} from 'react';
import {creatorSync,syncStatusEvent} from './sync';
import '../../herCompatibility/builder.css';
import './remote.css';
export default function CreatorCloudPanel(){
 const [open,setOpen]=useState(false),[state,setState]=useState(creatorSync.get),[busy,setBusy]=useState(false),[link,setLink]=useState(''),[message,setMessage]=useState('');
 const modal=useRef<HTMLDialogElement>(null),lock=useRef(false);
 useEffect(()=>{if(!open)return;const node=modal.current!;node.showModal();return()=>node.close();},[open]);
 useEffect(()=>{const update=()=>setState(creatorSync.get());window.addEventListener(syncStatusEvent,update);creatorSync.start();update();return()=>window.removeEventListener(syncStatusEvent,update);},[]);
 const publish=async()=>{
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setLink('');
  try{await creatorSync.publishNow();setLink(`${window.location.origin}/universo-dela/visao`);setMessage('Universo publicado. Somente quizzes concluídos estão disponíveis para visitantes.');setOpen(true);}
  catch(error){setMessage(error instanceof Error?error.message:'Não foi possível publicar. Seu trabalho local foi preservado.');setOpen(true);}
  finally{lock.current=false;setBusy(false);}
 };
 const label=state.status==='synced'?'Publicado no Supabase':state.status==='syncing'?'Publicando...':state.status==='error'?'Publicação não confirmada':'Rascunho neste navegador';
 return <><button disabled={busy} className="her-cloud-access" aria-label="Salvar e publicar" onClick={()=>void publish()}><span>Salvar e publicar</span><small aria-hidden="true">{label}</small></button>{open&&<dialog ref={modal} className="compatibility-builder her-cloud-panel" aria-label="Publicação do meu universo" onCancel={()=>setOpen(false)}>
 <header className="builder-header"><div><p className="builder-kicker">SEU UNIVERSO</p><h1>{link?'Universo publicado':'Publicação não confirmada'}</h1></div><button onClick={()=>setOpen(false)}>Fechar</button></header>
 <div className="builder-content"><p role={link?'status':'alert'}>{message}</p>{link&&<><p>Link para conhecer seu universo:</p><a className="view-universe-link" href={link}>{link}</a><button onClick={()=>void navigator.clipboard.writeText(link).then(()=>setMessage('Link copiado.')).catch(()=>setMessage('Não foi possível copiar. Você pode copiar o link acima.'))}>Copiar link</button></>}
 {!link&&<button disabled={busy} onClick={()=>void publish()}>Tentar publicar novamente</button>}
 <p>Seus rascunhos ficam neste navegador. O Supabase guarda a versão publicada e as respostas recebidas. Novas edições só aparecem para visitantes quando você publicar novamente.</p></div></dialog>}</>;
}
