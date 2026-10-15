import { useSyncExternalStore } from 'react';
import { creatorSync, syncStatusEvent } from './sync';
import { remoteEnabled } from './repository';
const subscribe=(callback:()=>void)=>{window.addEventListener(syncStatusEvent,callback);return()=>window.removeEventListener(syncStatusEvent,callback);};
export function RemoteSaveStatus({localSaving}:{localSaving:boolean}){
  const state=useSyncExternalStore(subscribe,creatorSync.get);
  if(!remoteEnabled)return null;
  const label=localSaving?'Atualizando rascunho neste navegador.':state.status==='synced'?'Versão publicada no Supabase; rascunhos continuam neste navegador.':state.status==='syncing'?'Publicando no Supabase...':state.status==='error'?`Publicação não confirmada: ${state.message}`:'Rascunho neste navegador. Use Salvar e publicar para disponibilizar o universo.';
  return <p className="builder-save-status" role="status" aria-live="polite">{label}</p>;
}
