import {useCallback,useEffect,useRef,useState} from 'react';
import type {MailActor} from './repository';
import {prepareMailNotifications,pushSupport} from './notifications';
import {noPush,pushDevice,pushRequest,savePushState,pushStateKey,type DeviceState} from './pushRepository';
import './push.css';
const name=(actor:MailActor)=>actor==='arthur'?'Arthur':'Carol';
export function PushBell({identity}:{identity:MailActor}){
 const [state,setState]=useState<DeviceState>(noPush),[ready,setReady]=useState(false),[key,setKey]=useState(''),[subscribed,setSubscribed]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[confirm,setConfirm]=useState(false),[permission,setPermission]=useState<NotificationPermission>(typeof Notification==='undefined'?'default':Notification.permission);
 const dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),locked=useRef(false),mounted=useRef(true);
 const support=pushSupport();
 const refresh=useCallback(async()=>{
  const device=pushDevice();
  const [config,current]=await Promise.all([pushRequest<{publicKey:string}>({action:'config'}),pushRequest<DeviceState>({action:'status',...device})]);
  await savePushState(device,current);
  const registration=await navigator.serviceWorker.register('/stellar-mail-sw.js',{scope:'/'}),subscription=await registration.pushManager.getSubscription();
  if(mounted.current){setKey(config.publicKey);setState(previous=>previous.generation>current.generation?previous:current);setSubscribed(Boolean(subscription&&current.endpoint===subscription.endpoint));setPermission(Notification.permission);setReady(true);setError('');}
 },[]);
 useEffect(()=>{
  mounted.current=true;if(support)return;
  let next=0;
  const check=()=>{if(document.hidden||locked.current||Date.now()<next)return;next=Date.now()+15000;void refresh().catch(e=>{if(mounted.current){setReady(false);setError(e instanceof Error?e.message:'Notificações indisponíveis.');}});};
  const changed=(event:StorageEvent)=>{if(event.key===pushStateKey){next=0;check();}};
  check();window.addEventListener('focus',check);window.addEventListener('stellar-push-changed',check);window.addEventListener('storage',changed);
  return()=>{mounted.current=false;window.removeEventListener('focus',check);window.removeEventListener('stellar-push-changed',check);window.removeEventListener('storage',changed);};
 },[refresh,support]);
 useEffect(()=>{if(!opened)return;const node=dialog.current!,trigger=button.current;node.showModal();return()=>{node.close();trigger?.focus();};},[opened]);
 const active=ready&&state.enabled&&state.identity===identity&&subscribed&&permission==='granted';
 const opposite=ready&&state.enabled&&state.identity!==identity;
 const change=async(cancel=false)=>{
  if(locked.current)return;locked.current=true;setBusy(true);setError('');
  const expected=state.generation;
  try{
   const device=pushDevice();
   if(cancel){
    const updated=await pushRequest<DeviceState>({action:'cancel',...device,expected});await savePushState(device,updated);setState(updated);setSubscribed(false);
    const registration=await navigator.serviceWorker.getRegistration('/');await (await registration?.pushManager.getSubscription())?.unsubscribe();
   }else{
    // requestPermission is the first awaited operation inside this user gesture.
    const granted=await prepareMailNotifications(key,async subscription=>{
     const updated=await pushRequest<DeviceState>({action:'subscribe',...device,identity,expected,subscription,replace:opposite&&confirm});await savePushState(device,updated);setState(updated);setSubscribed(true);
    });
    setPermission(Notification.permission);
    if(!granted){setError('Permissão não concedida. Você pode liberar notificações nas configurações deste site no navegador.');return;}
   }
   setConfirm(false);setOpened(false);window.dispatchEvent(new Event('stellar-push-changed'));
  }catch(e){try{await refresh();}catch{/* Keep the existing subscription; never switch on navigation. */}setError(e instanceof Error?e.message:'Não foi possível atualizar.');}
  finally{locked.current=false;setBusy(false);}
 };
 return <>
  <button ref={button} className="stellar-push-bell" aria-label={`Notificações ${active?'ativadas':'desativadas'} neste dispositivo`} aria-haspopup="dialog" data-active={active} onClick={()=>{setConfirm(false);setOpened(true);}}>
   <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21h4"/>{!active&&<path d="m3 2 18 20"/>}</svg>
  </button>
  {opened&&<dialog ref={dialog} className="stellar-push-panel" aria-labelledby="stellar-push-title" onCancel={e=>{e.preventDefault();if(!busy)setOpened(false);}}>
   <h2 id="stellar-push-title">Avisos do Correio Estelar</h2>
   <p>{support||permission==='denied'?'':active?`Este dispositivo recebe avisos de cartas para ${name(identity)}.`:opposite?`Este dispositivo está inscrito para ${name(state.identity!)}. Visitar outra galáxia não muda essa escolha.`:`Receba um aviso discreto quando uma nova carta chegar para ${name(identity)}. O texto da carta permanece no correio.`}</p>
   {support&&<p>{support}</p>}
   {permission==='denied'&&<p>O navegador bloqueou as notificações. Libere a permissão nas configurações deste site no navegador ou aplicativo e volte aqui.</p>}
   {!support&&permission!=='denied'&&(!ready?<button disabled={busy} onClick={()=>{setBusy(true);void refresh().catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Verificar disponibilidade</button>:active?<button disabled={busy} onClick={()=>void change(true)}>Desativar neste dispositivo</button>:confirm?<section role="alertdialog" aria-label="Substituir identidade das notificações"><p>Ativar para {name(identity)} desativará as notificações de {name(state.identity!)} neste dispositivo. Deseja substituir?</p><button disabled={busy} onClick={()=>void change()}>Confirmar substituição</button><button disabled={busy} onClick={()=>setConfirm(false)}>Manter {name(state.identity!)}</button></section>:<button disabled={busy||!key} onClick={()=>opposite?setConfirm(true):void change()}>Ativar notificações{opposite?` para ${name(identity)}`:''}</button>)}
   {permission==='denied'&&ready&&state.enabled&&state.identity===identity&&<button disabled={busy} onClick={()=>void change(true)}>Desativar neste dispositivo</button>}
   {error&&<p role="status">{error}</p>}
   <p className="stellar-push-note">A entrega também depende do navegador, da conexão e dos ajustes do sistema. O sininho mostra a inscrição neste dispositivo, não o modo Não Perturbe.</p>
   <button disabled={busy} onClick={()=>setOpened(false)}>Voltar à galáxia</button>
  </dialog>}
 </>;
}
