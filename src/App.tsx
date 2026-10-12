import { EyesExperience } from './experiences/eyes/EyesExperience';
import { EyesEncounter, eyesUnlocked, eyesStarted, isEyesFinishOverride, saveEyesStarted, saveEyesWatched } from './experiences/eyes/progress';
import { readCoupleProgress } from './experiences/couple/logic';
import WishExperience, { WishInvitation } from './experiences/wishes/WishExperience';
import { useWishEncounter } from './experiences/wishes/useWishEncounter';
import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { experience as c } from './config/experience';
import { actReducer } from './core/state';
import { useReducedMotion } from './core/useReducedMotion';
import { Lock } from './components/Lock';
import { Narrative } from './components/Narrative';
import { Scanner } from './components/Scanner';
import { Ambient } from './components/Ambient';
import { feedback, setSound } from './effects/feedback';
import { isLetterId, lostLetters, type LetterId } from './experiences/letters/data';
import { LetterTargets, type LetterProjection } from './experiences/letters/LetterTargets';
import { readLetters, saveLetters } from './experiences/letters/progress';
import './experiences/letters/letters.css';
import { GardenExperience } from './experiences/garden/GardenExperience';
import './experiences/garden/garden.css';
import type { Destination, Navigation } from './graphics/travel';
import type { GardenProjection } from './graphics/engine';
import { readProgress } from './experiences/compatibility/logic';
import { BlackHoleExperience } from './experiences/blackHole/BlackHoleExperience';
import { readBlackHoleProgress, saveBlackHoleProgress } from './experiences/blackHole/progress';
import type { BlackHoleFragmentId } from './experiences/blackHole/data';
import type { BlackHoleProjection } from './graphics/blackHoleScene';
import './experiences/blackHole/blackHole.css';
import './experiences/compatibility/quiz.css';
import './experiences/couple/couple.css';
const LetterReader = lazy(() => import('./experiences/letters/LetterReader'));
const CoupleQuiz = lazy(() => import('./experiences/couple/CoupleQuiz'));
const CompatibilityQuiz = lazy(() => import('./experiences/compatibility/CompatibilityQuiz'));
const Cosmos = lazy(() => import('./graphics/Cosmos'));
export function App() {
  const finishEyesOverride = isEyesFinishOverride(window.location.search);
  const [act, dispatch] = useReducer(actReducer, 'lock'); const [scan, setScan] = useState(0); const [sound, setSoundState] = useState(false); const [preload, setPreload] = useState(false);
  const [navigation, setNavigation] = useState<Navigation>({phase:'GALAXY_IDLE', destination:'compatibility', skip:false, gardenEntered:false});
  const navigationRef = useRef(navigation); navigationRef.current = navigation;
  const [eyesSeen,setEyesSeen]=useState(eyesStarted);
  const [eyesReady,setEyesReady]=useState(false);
  const [eyesHint,setEyesHint]=useState(false);
  const eyesAccess=useRef<HTMLButtonElement>(null);
  const eyeClock=useRef(new EyesEncounter());
  const finishEyesStarted=useRef(false);
  const eyeInteracting=useRef(false);
  const eyeKeys=useRef(new Set<string>());
  const lastEyeActivity=useRef(-Infinity);
  const [coupleCompleted,setCoupleCompleted]=useState(()=>readCoupleProgress().completed);
  const [quizCompleted, setQuizCompleted] = useState(() => readProgress().completed);
  const access = useRef<HTMLButtonElement>(null); const coupleAccess = useRef<HTMLButtonElement>(null);
  const gardenAccess = useRef<HTMLButtonElement>(null);
  const gardenAcceptAccess = useRef<HTMLButtonElement>(null);
  const [lettersRead, setLettersRead] = useState(readLetters);
  const [blackHoleProgress, setBlackHoleProgress] = useState(readBlackHoleProgress);
  const [blackHoleFragment, setBlackHoleFragment] = useState<BlackHoleFragmentId | null>(null);
  const [blackHoleProjections, setBlackHoleProjections] = useState<readonly BlackHoleProjection[]>([]);
  const blackHoleAccess = useRef<HTMLButtonElement>(null);
  const [lettersFallback, setLettersFallback] = useState(false);
  const letterTargets = useRef(new Map<LetterId, HTMLButtonElement>());
  const onLettersFallback = useCallback(() => setLettersFallback(true), []);
  const projectLetters = useCallback((projections: readonly LetterProjection[]) => {
    for (const point of projections) {
      const node = letterTargets.current.get(point.id); if (!node) continue;
      node.style.left = `${point.x}px`; node.style.top = `${point.y}px`;
      node.dataset.onscreen = String(point.visible);
    }
  }, []);
  const projectBlackHole = useCallback((points: readonly BlackHoleProjection[]) => {
    setBlackHoleProjections(previous => points.every((point, index) => {
      const old = previous[index];
      return old?.id === point.id && old.visible === point.visible &&
        Math.abs(old.x - point.x) < 2 && Math.abs(old.y - point.y) < 2;
    }) ? previous : points.map(point => ({ ...point })));
  }, []);
  const projectGarden = useCallback((projection: GardenProjection) => {
    const node = gardenAccess.current;
    if (!node) return;
    node.style.left = `${projection.x}px`;
    node.style.top = `${projection.y}px`;
    node.dataset.onscreen = String(projection.visible);
  }, []);
  const projectBlackHoleAccess = useCallback((projection: GardenProjection) => {
    const node = blackHoleAccess.current;
    if (!node) return;
    node.style.left = `${projection.x}px`;
    node.style.top = `${projection.y}px`;
    node.dataset.onscreen = String(projection.visible);
  }, []);
  const skipAccess = useRef<HTMLButtonElement>(null);
  const travel = useCallback((destination: Destination) => {
    if (navigationRef.current.phase !== 'GALAXY_IDLE') return;
    const next: Navigation = {phase:'TRAVEL_TO_DESTINATION', destination, skip:false, gardenEntered:false};
    navigationRef.current = next; setNavigation(next);
  }, []);
  const openQuiz = useCallback(() => travel('compatibility'), [travel]);
  const openCouple = useCallback(() => travel('couple'), [travel]);
  const openGarden = useCallback(() => travel('garden'), [travel]);
  const openBlackHole = useCallback(() => travel('black-hole'), [travel]);
  const selectBlackHoleFragment = useCallback((id: BlackHoleFragmentId) => {
    setBlackHoleFragment(id);
    setBlackHoleProgress(previous => {
      if (previous.discovered.includes(id)) return previous;
      return { ...previous, discovered: [...previous.discovered, id] };
    });
  }, []);
  const closeBlackHoleFragment = useCallback(() => setBlackHoleFragment(null), []);
  const closeBlackHole = useCallback(() => {
    if (navigationRef.current.phase !== 'BLACK_HOLE_ACTIVE') return;
    setBlackHoleFragment(null);
    const next: Navigation = { ...navigationRef.current, phase: 'RETURN_TO_GALAXY', skip: false, blackHoleEntered: true };
    navigationRef.current = next; setNavigation(next);
  }, []);
  const blackHoleStarFormed = useCallback(() => {
    setBlackHoleProgress(previous => previous.starFormed ? previous : { ...previous, starFormed: true });
  }, []);
  const acceptGarden = useCallback(() => {
    if (navigationRef.current.phase !== 'PORTAL_INVITATION') return;
    const next: Navigation = {...navigationRef.current, phase:'PORTAL_ENTRY', gardenEntered:true, skip:false};
    navigationRef.current = next; setNavigation(next);
  }, []);
  const declineGarden = useCallback(() => {
    if (navigationRef.current.phase !== 'PORTAL_INVITATION') return;
    const next: Navigation = {...navigationRef.current, phase:'RETURN_TO_GALAXY', skip:false};
    navigationRef.current = next; setNavigation(next);
  }, []);
  const closeQuiz = useCallback(() => {
    if (navigationRef.current.phase !== 'QUIZ_ACTIVE' && navigationRef.current.phase !== 'LETTER_ACTIVE' && navigationRef.current.phase !== 'WISH_ACTIVE' && navigationRef.current.phase !== 'GARDEN_ACTIVE') return;
    setQuizCompleted(readProgress().completed);setCoupleCompleted(readCoupleProgress().completed);
    const next: Navigation = {...navigationRef.current, phase:'RETURN_TO_GALAXY', skip:false};
    navigationRef.current = next; setNavigation(next);
  }, []);
  const travelComplete = useCallback(() => {
    const current = navigationRef.current;
    if (current.phase !== 'TRAVEL_TO_DESTINATION' && current.phase !== 'PORTAL_ENTRY' && current.phase !== 'BLACK_HOLE_ENTRY' && current.phase !== 'RETURN_TO_GALAXY') return;
    const phase = current.phase === 'RETURN_TO_GALAXY'
      ? 'GALAXY_IDLE'
      : current.phase === 'PORTAL_ENTRY'
        ? 'GARDEN_ACTIVE'
      : current.phase === 'BLACK_HOLE_ENTRY'
          ? 'BLACK_HOLE_ACTIVE'
          : current.destination === 'garden'
            ? 'PORTAL_INVITATION'
          : current.destination === 'black-hole'
            ? 'BLACK_HOLE_ENTRY'
          : current.destination === 'wish'
            ? 'WISH_ACTIVE'
            : isLetterId(current.destination)
              ? 'LETTER_ACTIVE'
              : 'QUIZ_ACTIVE';
    const next: Navigation = {...current, phase, gardenEntered:phase === 'GALAXY_IDLE' ? false : current.gardenEntered, blackHoleEntered:phase === 'BLACK_HOLE_ACTIVE' || phase === 'GALAXY_IDLE' ? phase === 'BLACK_HOLE_ACTIVE' : current.blackHoleEntered, skip:false};
    navigationRef.current = next; setNavigation(next);
    if (next.phase === 'LETTER_ACTIVE' && isLetterId(next.destination)) {
      const id = next.destination;
      setLettersRead(previous => previous.includes(id) ? previous : [...previous,id]);
    }
  }, []);
  useEffect(() => { saveLetters(lettersRead); }, [lettersRead]);
  useEffect(() => { saveBlackHoleProgress(blackHoleProgress); }, [blackHoleProgress]);
  useEffect(() => {
    if (navigation.phase !== 'GALAXY_IDLE') return;
    const frame = requestAnimationFrame(() => {
      const target = isLetterId(navigation.destination) ? letterTargets.current.get(navigation.destination) : navigation.destination === 'eyes' ? eyesAccess.current : navigation.destination === 'garden' ? gardenAccess.current : navigation.destination === 'black-hole' ? blackHoleAccess.current : (navigation.destination === 'couple' ? coupleAccess : access).current;
      if(navigation.destination === 'wish' || navigation.destination === 'eyes' && eyesAccess.current?.dataset.onscreen !== 'true') main.current?.focus({preventScroll:true}); else target?.focus({preventScroll:true});
    });
    return () => cancelAnimationFrame(frame);
  }, [navigation.phase, navigation.destination]);
  const travelling = navigation.phase === 'TRAVEL_TO_DESTINATION' || navigation.phase === 'PORTAL_ENTRY' || navigation.phase === 'BLACK_HOLE_ENTRY' || navigation.phase === 'RETURN_TO_GALAXY';
  const quizOpen = navigation.phase === 'QUIZ_ACTIVE' && navigation.destination === 'compatibility';
  const letterOpen = navigation.phase === 'LETTER_ACTIVE' && isLetterId(navigation.destination);
  const coupleOpen = navigation.phase === 'QUIZ_ACTIVE' && navigation.destination === 'couple';
  const gardenInvitation = navigation.phase === 'PORTAL_INVITATION';
  const gardenActive = navigation.phase === 'GARDEN_ACTIVE';
  const returningFromGarden = navigation.phase === 'RETURN_TO_GALAXY' && navigation.destination === 'garden';
  const gardenJourney = navigation.destination === 'garden' && navigation.phase !== 'GALAXY_IDLE';
  const blackHoleOpen = navigation.phase === 'BLACK_HOLE_ACTIVE';
  const blackHoleJourney = navigation.destination === 'black-hole' && navigation.phase !== 'GALAXY_IDLE';
  useEffect(() => { if (gardenInvitation) gardenAcceptAccess.current?.focus({preventScroll:true}); }, [gardenInvitation]);
  useEffect(() => { if (travelling) skipAccess.current?.focus({preventScroll:true}); }, [travelling]);
  const [introDismissed, setIntroDismissed] = useState(false);
  const reduced = useReducedMotion(); const main = useRef<HTMLElement>(null);
  const advance = useCallback(() => dispatch({ type: 'advance', from: act }), [act]);
  const formed = useCallback(() => dispatch({ type: 'advance', from: 'forming' }), []);
  useEffect(() => { const timer = setTimeout(() => setPreload(true), 1200); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    const duration = act === 'unlocking' ? (reduced ? 800 : c.timing.unlocking) : act === 'recognized' ? c.timing.recognition : act === 'love' ? c.timing.love : 0;
    if (!duration) return; const timer = setTimeout(advance, duration); return () => clearTimeout(timer);
  }, [act, advance, reduced]);
  useEffect(() => {
    setIntroDismissed(false);
    if (act !== 'universe') return;
    const timer = setTimeout(() => setIntroDismissed(true), 5000);
    return () => clearTimeout(timer);
  }, [act]);
  useEffect(() => { if (['narrative','scan','universe'].includes(act)) main.current?.focus({ preventScroll: true }); },[act]);
  const wishOpen = navigation.phase === 'WISH_ACTIVE';
  const eyesActive=navigation.phase==='EYES_ACTIVE';
  const unlocked=eyesUnlocked(lettersRead,quizCompleted,coupleCompleted,blackHoleProgress);
  const encounter = useWishEncounter(!eyesHint && act === 'universe' && introDismissed && navigation.phase === 'GALAXY_IDLE');
  const startEyes=useCallback(()=>{
    if(navigationRef.current.phase!=='GALAXY_IDLE')return;
    setEyesReady(false);setEyesHint(false);setEyesSeen(true);
    if(!finishEyesOverride)saveEyesStarted();
    const next:Navigation={...navigationRef.current,phase:'EYES_ACTIVE',destination:'eyes',skip:false};
    navigationRef.current=next;setNavigation(next);
  },[finishEyesOverride]);
  const readyEyes=useCallback(()=>{setEyesReady(true);setEyesSeen(true);if(!finishEyesOverride)saveEyesWatched();},[finishEyesOverride]);
  const exitEyes=()=>{
    if(navigationRef.current.phase!=='EYES_ACTIVE')return;
    const next:Navigation={...navigationRef.current,phase:'RETURN_TO_GALAXY',skip:false};
    navigationRef.current=next;setNavigation(next);
  };
  const projectEyes=useCallback((point:GardenProjection)=>{
    const node=eyesAccess.current;if(!node)return;
    node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;node.dataset.onscreen=String(point.visible);
    node.tabIndex=point.visible?0:-1;
  },[]);
  useEffect(()=>{
    if(!finishEyesOverride||finishEyesStarted.current||act!=='universe'||!introDismissed||
      navigation.phase!=='GALAXY_IDLE'||lettersFallback||encounter.invited)return;
    finishEyesStarted.current=true;
    startEyes();
  },[finishEyesOverride,act,introDismissed,navigation.phase,lettersFallback,encounter.invited,startEyes]);
  useEffect(()=>{
    let last=performance.now();
    const timer=setInterval(()=>{
      const now=performance.now();
      const eligible=!finishEyesOverride&&unlocked&&!eyesSeen&&!lettersFallback&&act==='universe'&&introDismissed&&navigationRef.current.phase==='GALAXY_IDLE'&&!encounter.invited;
      const active=!document.hidden&&document.hasFocus()&&now-lastEyeActivity.current<5000;
      const launch=eyeClock.current.tick(now-last,eligible,active);last=now;
      setEyesHint(eligible&&eyeClock.current.elapsed>=7000);
      if(launch && !eyeInteracting.current && eyeKeys.current.size===0 && now-lastEyeActivity.current>=500) {eyeClock.current.elapsed=0;startEyes();}
    },250);
    return()=>clearInterval(timer);
  },[finishEyesOverride,unlocked,eyesSeen,lettersFallback,act,introDismissed,encounter.invited,startEyes]);
  const [wishDelivered,setWishDelivered] = useState(false);
  const acceptWish = () => { if(!encounter.invited || navigationRef.current.phase !== 'GALAXY_IDLE') return; encounter.dismiss();setWishDelivered(false);travel('wish'); };
  const wishJourney = navigation.destination === 'wish' && navigation.phase !== 'GALAXY_IDLE';
  const shootingState = wishJourney ? wishDelivered && navigation.phase === 'WISH_ACTIVE' ? 'delivered' : 'held' : encounter.invited ? 'invited' : 'hidden';
  const chapter = ['lock','unlocking'].includes(act) ? 0 : ['narrative','scan','recognized','love'].includes(act) ? 1 : 2;
  const toggleSound = () => { try { setSound(!sound); setSoundState(!sound); if (!sound) feedback('tap'); } catch { setSoundState(false); } };
  return <div onPointerDownCapture={()=>{eyeInteracting.current=true;}} onPointerUpCapture={()=>{eyeInteracting.current=false;}} onPointerCancelCapture={()=>{eyeInteracting.current=false;}} onWheelCapture={()=>{lastEyeActivity.current=performance.now();}} onPointerMoveCapture={()=>{lastEyeActivity.current=performance.now();}} onKeyDownCapture={event=>{if(['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(event.key)){lastEyeActivity.current=performance.now();eyeKeys.current.add(event.key);}}} onKeyUpCapture={event=>{eyeKeys.current.delete(event.key);}} onBlurCapture={()=>{eyeKeys.current.clear();}} className={`${eyesActive ? 'eyes-open' : ''} experience act-${act} ${quizOpen ? 'quiz-open' : ''} ${coupleOpen ? 'couple-open' : ''} ${wishOpen ? 'wish-open' : ''} ${letterOpen ? 'letter-open' : ''} ${travelling ? 'is-travelling' : ''} ${gardenActive || returningFromGarden ? 'garden-open' : ''} ${gardenInvitation ? 'portal-prompt-open' : ''} ${blackHoleOpen || blackHoleJourney ? 'black-hole-open' : ''} ${introDismissed ? 'is-exploring' : ''} ${reduced ? 'reduced-motion' : ''}`} data-act={act} data-navigation={navigation.phase}>
    <Ambient/>{(preload || act !== 'lock') && <Suspense fallback={null}><Cosmos eyesWatched={eyesSeen} eyesHint={eyesHint} onEyesReady={readyEyes} onEyesProjection={projectEyes} act={act} scan={scan} reduced={reduced} onFormed={formed} shootingState={shootingState} onWish={acceptWish} onGarden={openGarden} onGardenProjection={projectGarden} onBlackHole={openBlackHole} onBlackHoleFragment={selectBlackHoleFragment} onBlackHoleAccessProjection={projectBlackHoleAccess} onBlackHoleProjection={projectBlackHole} blackHoleDiscovered={blackHoleProgress.discovered} blackHoleStarFormed={blackHoleProgress.starFormed} onBlackHoleStarFormed={blackHoleStarFormed} quizOpen={eyesActive || quizOpen || coupleOpen || letterOpen || wishOpen || gardenInvitation || gardenActive || blackHoleOpen} compatibilityCompleted={quizCompleted} onCompatibility={openQuiz} onCouple={openCouple} navigation={navigation} onTravelComplete={travelComplete} lettersRead={lettersRead} onLetter={travel} onLetterProjection={projectLetters} onLettersFallback={onLettersFallback}/></Suspense>}
    <header className="site-header" inert={eyesActive || travelling || letterOpen || wishOpen || gardenJourney || blackHoleJourney}><div className="wordmark" aria-label={c.brand}><svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-hidden="true"><ellipse cx="14" cy="14" rx="13" ry="5" transform="rotate(-40 14 14)" stroke="currentColor" strokeWidth=".8"/><circle cx="14" cy="14" r="2.5" fill="currentColor"/></svg>{c.brand}<span> / </span><small>{c.brandNote}</small></div><button className={`sound-toggle ${sound ? 'sound-on' : ''}`} onClick={toggleSound} aria-label={sound ? c.labels.audioOff : c.labels.audioOn} aria-pressed={sound}><span/><span/><span/><span/></button></header>
    <main ref={main} tabIndex={-1} inert={eyesActive || quizOpen || coupleOpen || letterOpen || wishOpen || gardenInvitation || gardenActive || blackHoleOpen || travelling}>
      {(act === 'lock' || act === 'unlocking') && <Lock opening={act === 'unlocking'} onUnlock={advance}/>}
      {act === 'narrative' && <Narrative onComplete={advance}/>}
      {['scan','recognized','love'].includes(act) && <Scanner act={act} onComplete={advance} onProgress={setScan}/>}
      {act === 'forming' && <div className="formation-caption" aria-live="polite">{c.scan.love}</div>}
      {act === 'universe' && <section className={`universe-scene scene ${introDismissed ? 'intro-dismissed' : ''}`}><p className="eyebrow">{c.galaxy.eyebrow}</p><h1>{c.galaxy.title[0]}<br/><em>{c.galaxy.title[1]}</em></h1><p className="subtitle">{c.galaxy.subtitle}</p><button className="restart" onClick={() => { setScan(0); dispatch({type:'restart'}); }}>{c.labels.restart}<span aria-hidden="true"> ↺</span></button></section>}
      {act === 'universe' && <button ref={access} className={`compatibility-access ${quizCompleted ? 'completed' : ''}`} onClick={openQuiz}><span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d={quizCompleted ? 'M8 13L2 7C-1 2 6 0 8 4C10 0 17 2 14 7Z' : 'M8 1L10 6L15 8L10 10L8 15L6 10L1 8L6 6Z'}/></svg></span>Compatibilidade{quizCompleted && <span className="sr-only"> — rever declaração</span>}</button>}
      {act === 'universe' && <button ref={coupleAccess} className="couple-access" onClick={openCouple}>Quiz de Casal</button>}
      {act === 'universe' && <LetterTargets targets={letterTargets} read={lettersRead} fallback={lettersFallback} onSelect={travel}/>}
      {act === 'universe' && <div className={`garden-access-targets${lettersFallback ? ' garden-access-fallback' : ''}`} role="group" aria-label="Portal do Jardim Eterno">
        <button ref={gardenAccess} className="garden-access-target" data-onscreen="false" aria-label="Aproximar-se do portal do Jardim Eterno" onClick={openGarden}>
          <span className="garden-access-target-label">Portal do Jardim Eterno</span>
        </button>
      </div>}
      {act === 'universe' && <div className={`black-hole-access-targets${lettersFallback ? ' black-hole-access-fallback' : ''}`} role="group" aria-label="Buraco Negro dos Segredos">
        <button ref={blackHoleAccess} className="black-hole-access-target" data-onscreen="false" aria-label="Aproximar-se do Buraco Negro dos Segredos" onClick={openBlackHole}>
          <span>Buraco Negro dos Segredos</span>
        </button>
      </div>}
      {act==='universe'&&eyesSeen&&!lettersFallback&&<button ref={eyesAccess} className="eyes-revisit" data-onscreen="false" aria-label="Rever o olhar entre as estrelas" onClick={startEyes}><svg viewBox="0 0 80 40" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 20Q17 6 32 20Q17 33 3 20M48 20Q63 6 77 20Q63 33 48 20"/><circle cx="18" cy="20" r="4"/><circle cx="63" cy="20" r="4"/></svg></button>}
    </main>
    {eyesActive&&<EyesExperience ready={eyesReady} onExit={exitEyes}/>}
    <WishInvitation visible={encounter.invited && navigation.phase === 'GALAXY_IDLE'} onAccept={acceptWish} onDismiss={() => {encounter.dismiss();main.current?.focus({preventScroll:true});}}/>
    {gardenInvitation && <section className="garden-portal-invitation" role="dialog" aria-modal="true" aria-labelledby="garden-portal-question">
      <p id="garden-portal-question">Existe um lugar que eu guardei especialmente pra você. Quer entrar?</p>
      <div><button ref={gardenAcceptAccess} onClick={acceptGarden}>Sim, quero entrar</button><button onClick={declineGarden}>Agora não</button></div>
    </section>}
    {wishOpen && <WishExperience onExit={closeQuiz} onDelivered={() => setWishDelivered(true)}/>}
    {blackHoleOpen && <BlackHoleExperience discovered={blackHoleProgress.discovered} starFormed={blackHoleProgress.starFormed} selected={blackHoleFragment} projections={blackHoleProjections} onSelect={selectBlackHoleFragment} onCloseFragment={closeBlackHoleFragment} onExit={closeBlackHole}/>}
    {quizOpen && <Suspense fallback={<div className="compatibility-quiz" role="status">Abrindo nossa constelação...</div>}><CompatibilityQuiz onExit={closeQuiz}/></Suspense>}
    {coupleOpen && <Suspense fallback={<div className="couple-quiz" role="status">Abrindo nossas estrelas...</div>}><CoupleQuiz onExit={closeQuiz}/></Suspense>}
    {letterOpen && isLetterId(navigation.destination) && <Suspense fallback={<div className="letter-reader" role="status">Abrindo carta...</div>}><LetterReader id={navigation.destination} onExit={closeQuiz}/></Suspense>}
    {gardenActive || returningFromGarden ? <GardenExperience returning={returningFromGarden} onExit={closeQuiz}/> : null}
    {travelling && <div className={`travel-overlay destination-${navigation.destination}${navigation.phase === 'PORTAL_ENTRY' ? ' portal-crossing' : ''}${navigation.phase === 'BLACK_HOLE_ENTRY' ? ' black-hole-crossing' : ''}`} role="status"><p>{navigation.phase === 'RETURN_TO_GALAXY' ? 'Voltando à galáxia' : navigation.phase === 'PORTAL_ENTRY' ? 'Atravessando o portal' : navigation.phase === 'BLACK_HOLE_ENTRY' ? 'Atravessando o horizonte de eventos' : navigation.destination === 'garden' ? 'Aproximando-se do jardim' : navigation.destination === 'black-hole' ? 'Aproximando-se do Buraco Negro dos Segredos' : navigation.destination === 'wish' ? 'Acompanhando a estrela cadente' : isLetterId(navigation.destination) ? `Encontrando ${lostLetters.find(letter => letter.id === navigation.destination)!.title}` : navigation.destination === 'couple' ? 'Viajando para Quiz de Casal' : 'Viajando para Compatibilidade'}</p><button ref={skipAccess} onClick={() => setNavigation(current => ({...current, skip:true}))}>Pular animação</button></div>}
    <footer className="site-footer" inert={eyesActive || travelling || letterOpen || wishOpen || gardenJourney || blackHoleJourney}><span className="footer-note">{act === 'universe' ? c.galaxy.footer : c.footerNote}</span><ol className="chapters" aria-label="Atos da experiência">{c.labels.chapters.map((label,i) => <li key={label} className={i === chapter ? 'active' : i < chapter ? 'complete' : ''} aria-current={i === chapter ? 'step' : undefined}><span className="chapter-number">0{i+1}</span><span className="chapter-label">{label}</span></li>)}</ol><span className="footer-coordinate" aria-hidden="true">∞ &nbsp; / &nbsp; {c.coordinate}</span></footer>
  </div>;
}
