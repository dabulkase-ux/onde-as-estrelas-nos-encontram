import {useStellarMail} from '../../stellarMail/useStellarMail';
import {useHerElements} from '../elements/useHerElements';
import { useHerLetters } from '../letters/useHerLetters';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../../core/useReducedMotion';
import { ExplorationView } from '../view/ExplorationView';
import { remoteRepository, type Kind, type Publication } from './repository';
import type { GardenProjection } from '../../../graphics/engine';
import './remote.css';
const emptyHoles:NonNullable<Publication['blackHoles']>=[];
const emptyLetters:NonNullable<Publication['letters']>=[];
const Cosmos=lazy(()=>import('../../../graphics/Cosmos'));
const PublishedQuiz=lazy(()=>import('./PublishedQuiz'));
export default function PublishedUniverse({onReturn}:{onReturn:()=>void}){
 const [mailOpen,setMailOpen]=useState(false);
  const [publication,setPublication]=useState<Publication|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[open,setOpen]=useState<Kind|null>(null);
  const herLetters=useHerLetters(publication?.letters??emptyLetters),herElements=useHerElements(publication?.blackHoles??emptyHoles);
  const failHerLetters=herLetters.canvasProps.onLettersFallback,failHerElements=herElements.fallback;
  const herFallback=useCallback(()=>{failHerLetters();failHerElements();},[failHerLetters,failHerElements]);
  const quizAccess=useRef<HTMLButtonElement>(null),coupleAccess=useRef<HTMLButtonElement>(null),reduced=useReducedMotion();
  useEffect(()=>{let active=true;setLoading(true);setError('');setPublication(null);remoteRepository.public().then(data=>{if(active){if(data.publication&&(!data.publication.galaxy?.created||!data.publication.galaxy.colors?.length||data.publication.configuration?.generator!=='spiral-v1'))throw new Error('A publicação não pôde ser lida.');setPublication(data.publication);}}).catch(error=>{if(active)setError(error instanceof Error?error.message:'Não foi possível carregar este universo.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[retry]);
  const projectQuiz=useCallback((point:GardenProjection)=>{const node=quizAccess.current;if(node){node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;node.dataset.onscreen=String(point.visible);}},[]);
  const projectCouple=useCallback((point:GardenProjection)=>{const node=coupleAccess.current;if(node){node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;node.dataset.onscreen=String(point.visible);}},[]);
  const openQuiz=useCallback(()=>setOpen('compatibility'),[]),openCouple=useCallback(()=>setOpen('couple'),[]),formed=useCallback(()=>{},[]);
  const mail=useStellarMail(Boolean(publication)&&!open&&!herLetters.journey&&!herElements.journey,'carol',mailOpen,setMailOpen,true);
  if(loading||error||!publication)return <section className="universe-view-empty" aria-label="Universo publicado"><div><p className="builder-kicker">ONDE AS ESTRELAS NOS ENCONTRAM</p><h1>{loading?'Encontrando suas estrelas...':error?'Não foi possível encontrar este universo.':'Este universo ainda não foi publicado.'}</h1><p role={error?'alert':'status'}>{error||(loading?'Carregando a versão publicada.':'A criadora poderá publicar quando estiver pronta. Rascunhos permanecem privados.')}</p>{!loading&&<button onClick={()=>setRetry(value=>value+1)}>Tentar novamente</button>}<button onClick={onReturn}>Voltar à criação</button><a href="/">Conhecer o universo original</a></div></section>;
  return <div className={`her-view her-active experience act-universe ${herElements.journey?'her-hole-open':''} ${herLetters.journey?'her-letter-active':''} is-exploring ${reduced?'reduced-motion':''}`} data-act="universe">
    <ExplorationView data={{galaxy:publication.galaxy,compatibility:publication.compatibility,couple:publication.couple,hasErrors:false}} source="published" onReturn={onReturn} onOpenQuiz={openQuiz} onOpenCouple={openCouple} quizOpen={open==='compatibility'} coupleOpen={open==='couple'} quizAccess={quizAccess} coupleAccess={coupleAccess}/>
    <Suspense fallback={null}><Cosmos mailbox={mail.scene} {...herLetters.canvasProps} herElements={herElements.canvas} onLettersFallback={herFallback} act="universe" scan={0} reduced={reduced} onFormed={formed} herUniverse={publication.galaxy} herView herCompatibilityAvailable={Boolean(publication.compatibility)} herCoupleAvailable={Boolean(publication.couple)} onHerQuiz={openQuiz} onHerCouple={openCouple} onHerQuizProjection={projectQuiz} onHerCoupleProjection={projectCouple} herQuizOpen={mailOpen||Boolean(open)||Boolean(herLetters.journey)||Boolean(herElements.journey)}/></Suspense>
    {mail.overlay}
    {!open&&!herElements.journey&&herLetters.overlay}
    {!open&&!herLetters.journey&&herElements.overlay}
    {open&&publication[open]&&<Suspense fallback={<p role="status">Abrindo sua experiência...</p>}><PublishedQuiz key={open} publication={publication} kind={open} onExit={()=>setOpen(null)}/></Suspense>}
  </div>;
}
