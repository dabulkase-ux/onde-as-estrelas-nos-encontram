import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { palette, toggleColor, type HerProgress } from './progress';
import './herUniverse.css';
import { HerStars } from './HerStars';
import { NexusSpeech, nexusLines } from './NexusSpeech';
export function HerUniverse({ progress, onChange, reduced, storageFailed, travelReady, creationReady, quizOpen, onOpenQuiz, quizAccess, coupleOpen, onOpenCouple, coupleAccess, onView }: { progress: HerProgress; onChange: (next: HerProgress) => void; reduced: boolean; storageFailed: boolean; travelReady: boolean; creationReady: boolean; quizOpen: boolean; onOpenQuiz: () => void; quizAccess: RefObject<HTMLButtonElement|null>; coupleOpen: boolean; onOpenCouple: () => void; coupleAccess: RefObject<HTMLButtonElement|null>; onView:()=>void }) {
  const line = progress.dialogue ?? 0;
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  const [readyLine, setReadyLine] = useState(()=>progress.created?2:0);
  const heading = useRef<HTMLHeadingElement>(null);
  const previouslyOpen=useRef(quizOpen);
  const previouslyCoupleOpen=useRef(coupleOpen);
  useEffect(()=>{
    const restore=previouslyCoupleOpen.current&&!coupleOpen;previouslyCoupleOpen.current=coupleOpen;
    if(restore)coupleAccess.current?.focus({preventScroll:true});
  },[coupleOpen,coupleAccess]);
  useEffect(()=>{
    const restore=previouslyOpen.current&&!quizOpen;previouslyOpen.current=quizOpen;
    if(!restore)return;
    quizAccess.current?.focus({preventScroll:true});
  },[quizOpen,quizAccess]);
  useEffect(() => { heading.current?.focus(); }, [progress.stage]);
  useEffect(() => {
    if (acknowledged === 'travel' && progress.stage === 'travel' && travelReady) onChange({ ...progress, stage: 'colors' });
    if (acknowledged === 'creating' && progress.stage === 'creating' && creationReady) onChange({ ...progress, stage: 'ready', created: true });
  }, [acknowledged, progress, travelReady, creationReady, onChange]);
  const speech = progress.stage === 'travel' ? nexusLines[line] : progress.stage === 'colors' ? 'Antes de criarmos qualquer estrela, preciso saber uma coisa: quais cores você gostaria de encontrar no seu universo?' : progress.stage === 'creating' ? 'Um pouco de luz… e o espaço começa a ganhar vida.' : readyLine === 0 ? 'Pronto… suas primeiras estrelas nasceram.' : 'É só o começo. Ainda temos muita coisa para descobrir por aqui.';
  const proceed = () => {
    if (progress.stage === 'travel' && line < nexusLines.length - 1) onChange({ ...progress, dialogue: line + 1 });
    else if (progress.stage === 'ready') setReadyLine(value => Math.min(2, value + 1));
    else setAcknowledged(progress.stage);
  };
  return <section className={`her-universe stage-${progress.stage}`} data-her-stage={progress.stage} aria-label="O universo dela">
    <header><span>ONDE AS ESTRELAS NOS ENCONTRAM</span><a href="/">Universo original</a></header>
    {progress.stage==='ready' && <HerStars progress={progress} quizAccess={quizAccess} coupleAccess={coupleAccess} onOpenQuiz={onOpenQuiz} onOpenCouple={onOpenCouple}/>}
    <div className="nexus-dialog">
      <div className="nexus-avatar" aria-hidden="true"><div className="nexus-orbit"/><div className="nexus-core"><i/><i/></div></div>
      <span className="nexus-name">NEXUS <small>Seu companheiro de viagem</small></span>
      <h1 ref={heading} tabIndex={-1}>{progress.stage === 'travel' ? 'Um novo horizonte' : progress.stage === 'colors' ? 'Como brilha o seu universo?' : progress.stage === 'creating' ? 'O nascimento das suas estrelas' : 'O universo tem suas cores'}</h1>
      {acknowledged !== progress.stage && readyLine < 2 && <NexusSpeech key={`${progress.stage}-${line}-${readyLine}`} text={speech} reduced={reduced} onContinue={proceed}/>}
      {acknowledged === progress.stage && (progress.stage === 'travel' || progress.stage === 'creating') && <p role="status">{speech}<br/><small>{progress.stage === 'travel' ? 'Chegando ao seu universo…' : 'Suas estrelas estão tomando forma…'}</small></p>}
      {progress.stage === 'colors' && <>
        <div className="universe-palette" role="group" aria-label="Escolha uma ou duas cores">{palette.map(color => <button key={color.id} style={{ '--swatch': color.hex } as CSSProperties} aria-pressed={progress.colors.includes(color.id)} aria-disabled={!progress.colors.includes(color.id) && progress.colors.length === 2} onClick={() => onChange({ ...progress, colors: toggleColor(progress.colors, color.id) })}><span/>{color.label}</button>)}</div>
        <p className="color-selection" role="status">{progress.colors.length ? `Suas cores: ${progress.colors.map(id => palette.find(color => color.id === id)!.label).join(' e ')}. ${progress.colors.length === 2 ? 'Desmarque uma para trocar.' : 'Você pode escolher mais uma.'}` : 'Escolha uma ou duas cores.'}</p>
        <button className="create-stars" disabled={!progress.colors.length || acknowledged !== 'colors'} onClick={() => onChange({ ...progress, stage: 'creating', created: false })}>Criar minhas estrelas</button>
      </>}
      {progress.stage === 'ready' && readyLine === 2 && <p className="universe-afterword">É só o começo. Ainda temos muita coisa para descobrir por aqui.<br/><small>Arraste para explorar. Use dois dedos ou a roda do mouse para se aproximar.</small></p>}
      {progress.stage==='ready' && <a className="view-universe-link" href="/universo-dela/visao" onClick={event=>{if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onView();}}}>Visualizar meu universo</a>}
      {storageFailed && <p role="status">Seu navegador não permitiu salvar esta visita. Mantenha esta página aberta para continuar.</p>}
    </div>
  </section>;
}
