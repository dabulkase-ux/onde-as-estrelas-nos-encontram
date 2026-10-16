import {ApiError,supabaseConfig} from '../../services/supabase';
import type {MailActor,StellarLetter} from '../../../supabase/functions/_shared/stellarMailHandler';
export type {MailActor,StellarLetter};
export const localMailPreview=import.meta.env.DEV&&import.meta.env.VITE_STELLAR_MAIL_LOCAL==='true';
export async function mailRequest<T>(body:unknown):Promise<T>{
 const url=localMailPreview?'/stellar-mail-local':`${supabaseConfig.url}/functions/v1/stellar-mail`;
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(localMailPreview?{}:{apikey:supabaseConfig.key})},body:JSON.stringify(body),credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new ApiError(response.status===404?'O correio ainda não foi habilitado neste servidor.':data.error??'Não foi possível consultar as estrelas. Tente novamente.',response.status);
 return data;
}
export function clearLegacyMailSession(){try{sessionStorage.removeItem('meu-universo.stellar-mail.session.v1');}catch{/* No other storage is changed. */}}
