import { useEffect, useRef, type RefObject } from 'react';
import { HerStars } from '../HerStars';
import { palette } from '../progress';
import type { HerProgress } from '../progress';
type ExplorationData={galaxy:HerProgress|null;compatibility:readonly unknown[]|null;couple:readonly unknown[]|null;hasErrors:boolean};
import './view.css';
export function EmptyUniverseView({onReturn}:{onReturn:()=>void}) {
  return <section className="universe-view-empty" aria-label="Universo indisponível"><div><p className="builder-kicker">ONDE AS ESTRELAS NOS ENCONTRAM</p><h1>Ainda não há um universo disponível neste navegador.</h1><p>As estrelas criadas ficam guardadas no navegador em que nasceram. Se havia um universo aqui, seus dados não puderam ser carregados.</p><button onClick={onReturn}>Voltar à criação</button><a href="/">Conhecer o universo original</a></div></section>;
}
export function ExplorationView({data,source='local',onReturn,onOpenQuiz,onOpenCouple,quizOpen,coupleOpen,quizAccess,coupleAccess}:{data:ExplorationData;source?:'local'|'published';onReturn:()=>void;onOpenQuiz:()=>void;onOpenCouple:()=>void;quizOpen:boolean;coupleOpen:boolean;quizAccess:RefObject<HTMLButtonElement|null>;coupleAccess:RefObject<HTMLButtonElement|null>}) {
  const previous=useRef({quizOpen,coupleOpen});
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{
    if(previous.current.quizOpen&&!quizOpen)quizAccess.current?.focus({preventScroll:true});
    if(previous.current.coupleOpen&&!coupleOpen)coupleAccess.current?.focus({preventScroll:true});
    previous.current={quizOpen,coupleOpen};
  },[quizOpen,coupleOpen,quizAccess,coupleAccess]);
  if(!data.galaxy)return <EmptyUniverseView onReturn={onReturn}/>;
  return <section className="universe-view" aria-label="Explorar o universo dela" data-view-colors={data.galaxy.colors.join(',')}>
    <header><div><p>ONDE AS ESTRELAS NOS ENCONTRAM</p><h1 tabIndex={-1} ref={heading}>O universo dela</h1></div><button onClick={onReturn}>Voltar à criação</button></header>
    <HerStars progress={data.galaxy} quizAccess={quizAccess} coupleAccess={coupleAccess} onOpenQuiz={onOpenQuiz} onOpenCouple={onOpenCouple} compatibility={Boolean(data.compatibility)} couple={Boolean(data.couple)}/>
    <footer><p>Arraste para explorar. Use dois dedos ou a roda do mouse para se aproximar.<span className="sr-only">Com teclado, use as setas e as teclas mais e menos no canvas.</span></p><p className="view-palette">{data.galaxy.colors.map(id=>palette.find(color=>color.id===id)!.label).join(' e ')} · {source==='published'?'Versão publicada':'Prévia local neste navegador'}</p>{!data.compatibility&&!data.couple&&<p role="status">As experiências deste universo ainda estão sendo preparadas.</p>}{data.hasErrors&&<p role="status">Uma das experiências não pôde ser carregada. Seus dados locais foram preservados.</p>}</footer>
  </section>;
}
