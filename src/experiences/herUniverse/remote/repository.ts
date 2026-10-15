import {holesRepository,herBlackHolesKey} from '../elements/repository';
import { lettersRepository, herLettersKey } from '../letters/repository';
import { ApiError, savingAvailable, supabaseConfig } from '../../../services/supabase';
import { herProgressStore, herUniverseKey } from '../progress';
import { quizRepository, herQuizKey } from '../../herCompatibility/repository';
import { coupleRepository, herCoupleKey } from '../../herCouple/repository';
export { localUniverseChangeEvent } from '../localChange';
import { validateDocument, type UniverseDocument, type Publication, type Kind } from '../../../../supabase/functions/_shared/herUniverseDomain';
export type { UniverseDocument, Publication, Kind };
export { remoteEnabled } from './config';
export type RemoteUniverse={id:string;revision:number;active_publication:string|null};
export type Correction={confirmed:true;correct?:boolean;correctOptions?:{id:string;text:string}[];comment?:string;result?:number};
export async function universeRequest<T>(body:unknown):Promise<T>{
  if(!savingAvailable)throw new ApiError('Publicação ainda não configurada.',503);
  const response=await fetch(`${supabaseConfig.url}/functions/v1/her-universe`,{method:'POST',headers:{'Content-Type':'application/json',apikey:supabaseConfig.key},body:JSON.stringify(body),credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new ApiError(data?.error??'Não foi possível conectar. Seus dados locais foram preservados.',response.status);
  if(!data)throw new ApiError('O serviço retornou dados inválidos.',502);return data as T;
}
export function localDocument():UniverseDocument{
  const compatibility=quizRepository.load(),couple=coupleRepository.load(),letters=lettersRepository.load(),holes=holesRepository.load();
  if(compatibility.error||couple.error||letters.error||holes.error)throw new Error('Um rascunho local não pôde ser lido. Ele foi preservado; corrija antes de importar.');
  return validateDocument({version:1,galaxy:herProgressStore.read(),configuration:{generator:'spiral-v1'},compatibility:compatibility.draft,couple:couple.draft,letters:letters.letters,...(holes.holes.length?{blackHoles:holes.holes}:{})});
}
export function restoreLocalDocument(input:unknown){
  const doc=validateDocument(input),keys=[herUniverseKey,herQuizKey,herCoupleKey,herLettersKey,herBlackHolesKey];
  const previous=keys.map(key=>localStorage.getItem(key));
  // Durable backup precedes any replacement; it also covers a browser closing mid-write.
  localStorage.setItem('meu-universo.before-remote-import.v1',JSON.stringify({keys,previous}));
  try{[doc.galaxy,doc.compatibility,doc.couple,doc.letters??[],doc.blackHoles??[]].forEach((value,index)=>localStorage.setItem(keys[index],JSON.stringify(value)));}
  catch(error){keys.forEach((key,index)=>{try{if(previous[index]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[index]!);}catch{/* Backup remains available. */}});throw error;}
}
export const remoteRepository={
  owner:()=>universeRequest<{universe:RemoteUniverse|null;capabilities?:{letters?:boolean;blackHoles?:boolean}}>({action:'owner'}),
  publish:(revision:number,document:UniverseDocument)=>universeRequest<{publication:{id:string;universeId:string;revision:number}}>({action:'publish',revision,document}),
  public:(universeId?:string)=>universeRequest<{publication:Publication|null}>({action:'public',...(universeId?{universeId}:{})}),
  start:(publicationId:string,kind:Kind)=>universeRequest<{attempt:string}>({action:'start',publicationId,kind}),
  answer:(attempt:string,index:number,optionId:string)=>universeRequest<Correction>({action:'answer',attempt,index,optionId}),
};
