import {ApiError,supabaseConfig} from '../../services/supabase';
import type {DeviceState} from '../../../supabase/functions/_shared/stellarPushHandler';
export type {DeviceState};
export const deviceKey='meu-universo.stellar-push.device.v1';
export const pushStateKey='meu-universo.stellar-push.state.v1';
export type PushDevice={device:string;secret:string};
export function pushDevice():PushDevice{
 const saved=localStorage.getItem(deviceKey);
 if(saved){const d=JSON.parse(saved);if(typeof d.device==='string'&&typeof d.secret==='string')return d;throw Error('Não foi possível reconhecer esta instalação.');}
 const d={device:crypto.randomUUID(),secret:Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('')};
 localStorage.setItem(deviceKey,JSON.stringify(d));return d;
}
export async function pushRequest<T>(body:unknown):Promise<T>{
 const response=await fetch(`${supabaseConfig.url}/functions/v1/stellar-push`,{method:'POST',headers:{'Content-Type':'application/json',apikey:supabaseConfig.key},body:JSON.stringify(body),credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new ApiError(data.error??'Não foi possível consultar as notificações.',response.status);
 return data;
}
export async function savePushState(device:PushDevice,state:DeviceState){
 await new Promise<void>((resolve,reject)=>{
  const request=indexedDB.open('stellar-push',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('settings');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('settings','readwrite'),store=tx.objectStore('settings'),previous=store.get('device');previous.onsuccess=()=>{if(previous.result?.device===device.device&&previous.result.generation>state.generation)return;store.put({...device,...state},'device');const marker=JSON.stringify({identity:state.identity,generation:state.generation,enabled:state.enabled});if(localStorage.getItem(pushStateKey)!==marker)localStorage.setItem(pushStateKey,marker);};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};
 });
}
export const noPush:DeviceState={identity:null,generation:0,enabled:false,endpoint:null};
