import {TravelOverlay} from '../../../graphics/TravelOverlay';
import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {lettersRepository,newLetterPosition,type HerLetter} from './repository';
import {holesRepository,elementPosition} from '../elements/repository';
import {LetterTargets,type LetterProjection} from '../../letters/LetterTargets';
import type {LetterJourney} from '../../../graphics/letterMarkers';
import './lettersEditor.css';
const LetterReader=lazy(()=>import('../../letters/LetterReader'));
export function useHerLetters(published?:readonly HerLetter[],editable=published===undefined){
 const [loaded]=useState(lettersRepository.load),[local,setLocal]=useState(loaded.letters),[draft,setDraft]=useState<HerLetter|null>(null),[error,setError]=useState(''),[read,setRead]=useState<string[]>([]),[fallback,setFallback]=useState(false),[journey,setJourney]=useState<LetterJourney|null>(null);
 const lastClosed=useRef<string|null>(null),targets=useRef(new Map<string,HTMLButtonElement>()),letters=published??local;
 const open=useCallback((id:string,readOnly=false)=>{const letter=letters.find(l=>l.id===id);if(letter){setDraft(editable&&!readOnly?{...letter,paragraphs:[...letter.paragraphs]}:null);setError('');setJourney({id,position:letter.position,phase:'outward'});}},[letters,editable]);
 const complete=useCallback(()=>setJourney(previous=>{if(previous?.phase==='outward')return {...previous,phase:'reading',skip:false};if(previous?.phase==='returning'){lastClosed.current=previous.id;return null;}return previous;}),[]);
 const project=useCallback((points:readonly LetterProjection<string>[])=>{for(const point of points){const node=targets.current.get(point.id);if(node){node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;node.dataset.onscreen=String(point.visible);}}},[]);
 const fail=useCallback(()=>setFallback(true),[]);
 useEffect(()=>{if(!journey&&lastClosed.current){targets.current.get(lastClosed.current)?.focus({preventScroll:true});lastClosed.current=null;}},[journey]);
 const finish=()=>{setDraft(null);if(journey){setRead(p=>p.includes(journey.id)?p:[...p,journey.id]);setJourney({...journey,phase:'returning',skip:false});}};
 const save=()=>{
  if(!draft||loaded.error){setError(loaded.error);return false;}
  if(!draft.title.trim()||!draft.paragraphs.some(p=>p.trim())){setError('Preencha o título e a mensagem antes de fechar.');return false;}
  const existing=local.find(l=>l.id===draft.id),holes=holesRepository.load();
  if(holes.error){setError(holes.error);return false;}
  const letter={...draft,position:existing?.position??(holes.holes.length?elementPosition([...local.map(l=>({position:l.position,radius:.65})),...holes.holes.map(h=>({position:h.position,radius:2}))],.65):newLetterPosition(local))};
  const next=existing?local.map(l=>l.id===letter.id?letter:l):[...local,letter],failure=lettersRepository.save(next);setError(failure);if(failure)return false;setLocal(next);return true;
 };
 const remove=(id:string)=>{if(!editable||loaded.error)return false;const next=local.filter(l=>l.id!==id),failure=lettersRepository.save(next);setError(failure);if(failure)return false;setLocal(next);return true;};
 const editor=Boolean(draft)&&!journey,current=draft??letters.find(l=>l.id===journey?.id);
 const overlay=<Suspense fallback={<p role="status">Abrindo suas cartinhas...</p>}>
 {!journey&&!editor&&letters.length>0&&<LetterTargets letters={letters} targets={targets} read={read} fallback={fallback} onSelect={open}/>}
 {journey&&journey.phase!=='reading'&&<TravelOverlay destination="letter" phase={journey.phase==='returning'?'RETURN_TO_GALAXY':'TRAVEL_TO_DESTINATION'} text={journey.phase==='returning'?'Voltando à galáxia':`Encontrando ${current?.title??''}`} onSkip={()=>setJourney(p=>p?{...p,skip:true}:null)} autoFocus/>}
 {(editor||journey?.phase==='reading')&&current&&<LetterReader key={current.id} content={current} onExit={finish} editing={editable&&draft?{title:draft.title,body:draft.paragraphs.join('\n'),onTitle:value=>setDraft({...draft,title:value}),onBody:value=>setDraft({...draft,paragraphs:value.split(/\r?\n/)}),onSave:save,error:loaded.error||error,onDiscard:editor?()=>setDraft(null):undefined,onDelete:local.some(l=>l.id===draft.id)?()=>remove(draft.id):undefined}:undefined}/>}
 </Suspense>;
 return {letters,open,locate:(id:string)=>open(id,true),remove,error:loaded.error||error,overlay,editor,journey,openEditor:()=>{setError(loaded.error);setDraft({id:`her-letter-${crypto.randomUUID()}`,title:'',paragraphs:[''],position:[0,0,0]});},canvasProps:{herLetters:letters,herLettersRead:read,herLetterJourney:journey,onHerLetter:open,onHerLettersProjection:project,onHerLetterTravelComplete:complete,onLettersFallback:fail}};
}
