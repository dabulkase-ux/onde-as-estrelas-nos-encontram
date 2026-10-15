import {ElementOrganizer} from './experiences/herUniverse/elements/ElementOrganizer';
import {TravelOverlay} from './graphics/TravelOverlay';
import {useHerElements} from './experiences/herUniverse/elements/useHerElements';
import { useHerLetters } from './experiences/herUniverse/letters/useHerLetters';
import { remoteEnabled } from './experiences/herUniverse/remote/config';
import { EyesExperience } from './experiences/eyes/EyesExperience';
import { HerUniverse } from './experiences/herUniverse/HerUniverse';
import { herProgressStore, type HerProgress } from './experiences/herUniverse/progress';
import { loadUniverseView } from './experiences/herUniverse/view/data';
import { EmptyUniverseView, ExplorationView } from './experiences/herUniverse/view/ExplorationView';
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
const CompatibilityBuilder = lazy(() => import('./experiences/herCompatibility/CompatibilityBuilder'));
const HerCoupleBuilder = lazy(() => import('./experiences/herCouple/CoupleBuilder'));
const ParticipantExperience = lazy(() => import('./experiences/herUniverse/view/ParticipantExperience'));
const PublishedUniverse = lazy(() => import('./experiences/herUniverse/remote/PublishedUniverse'));
const CreatorRecovery = lazy(()=>import('./experiences/herUniverse/remote/CreatorRecovery'));
const CreatorCloudPanel = lazy(() => import('./experiences/herUniverse/remote/CreatorCloudPanel'));
export function App() {

  const [herRoute,setHerRoute]=useState(()=>['/universo-dela','/universo-dela/visao'].includes(window.location.pathname.replace(/\/$/,'')));
  const [herView,setHerView]=useState(()=>window.location.pathname.replace(/\/$/,'')==='/universo-dela/visao');
  const herLetters=useHerLetters(undefined,!herView),herElements=useHerElements(undefined,!herView);
  const failHerLetters=herLetters.canvasProps.onLettersFallback,failHerElements=herElements.fallback;
  const herFallback=useCallback(()=>{failHerLetters();failHerElements();},[failHerLetters,failHerElements]);
  const [herProgress,setHerProgress]=useState(herProgressStore.read);
  const [herViewData,setHerViewData]=useState(loadUniverseView);
  const [storageFailed,setStorageFailed]=useState(false);
  const [herTravelReady,setHerTravelReady]=useState(false);
  const [herCreationReady,setHerCreationReady]=useState(false);
  const [herQuizOpen,setHerQuizOpen]=useState(false);
  const [herCoupleOpen,setHerCoupleOpen]=useState(false);
  const herCoupleAccess=useRef<HTMLButtonElement>(null);
  const openHerCouple=useCallback(()=>setHerCoupleOpen(true),[]);
  const closeHerCouple=useCallback(()=>setHerCoupleOpen(false),[]);
  const projectHerCouple=useCallback((point:GardenProjection)=>{
    const node=herCoupleAccess.current;if(!node)return;
    node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;node.dataset.onscreen=String(point.visible);
  },[]);
  const herQuizAccess=useRef<HTMLButtonElement>(null);
  const openHerQuiz=useCallback(()=>setHerQuizOpen(true),[]);
  const closeHerQuiz=useCallback(()=>setHerQuizOpen(false),[]);
  const projectHerQuiz=useCallback((point:GardenProjection)=>{
    const node=herQuizAccess.current;if(!node)return;
    node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;node.dataset.onscreen=String(point.visible);
  },[]);
  const herActive=herRoute&&herProgress.accepted&&(!herView||herProgress.created);
  const navigateHer=(view:boolean)=>{
    setHerQuizOpen(false);setHerCoupleOpen(false);setHerViewData(loadUniverseView(herProgress));
    window.history.pushState({},'',view?`/universo-dela/visao${remoteEnabled?'?preview=local':''}`:'/universo-dela');setHerRoute(true);setHerView(view);
  };
  const changeHer=useCallback((next:HerProgress)=>{setHerProgress(next);setStorageFailed(!herProgressStore.save(next));},[]);
  const acceptHer=useCallback(()=>{const previous=herProgressStore.read();changeHer(previous.accepted?previous:{...previous,accepted:true,stage:'travel',dialogue:previous.dialogue??0});window.history.pushState({},'','/universo-dela');setHerRoute(true);},[changeHer]);
  const herArrived=useCallback(()=>setHerTravelReady(true),[]);
  const herCreated=useCallback(()=>setHerCreationReady(true),[]);
  useEffect(()=>{
    if(!herActive || (herProgress.stage!=='travel' && herProgress.stage!=='creating'))return;
    const travel=herProgress.stage==='travel';
    if(travel)setHerTravelReady(false);else setHerCreationReady(false);
    // Failure recovery only releases the visual gate; it never acknowledges speech.
    const timer=setTimeout(()=>{if(travel)setHerTravelReady(true);else setHerCreationReady(true);},travel?18000:10000);
    return()=>clearTimeout(timer);
  },[herActive,herProgress.stage]);
  useEffect(()=>{const pop=()=>{const path=window.location.pathname.replace(/\/$/,'');const progress=herProgressStore.read();setHerRoute(['/universo-dela','/universo-dela/visao'].includes(path));setHerView(path==='/universo-dela/visao');setHerProgress(progress);setHerViewData(loadUniverseView(progress));setHerQuizOpen(false);setHerCoupleOpen(false);};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  const finishEyesOverride = !herRoute && isEyesFinishOverride(window.location.search);
  const [act, dispatch] = useReducer(actReducer, herRoute && herProgress.accepted ? 'universe' : 'lock'); const [scan, setScan] = useState(0); const [sound, setSoundState] = useState(false); const [preload, setPreload] = useState(false);
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
  useEffect(() => { if(!herRoute)saveLetters(lettersRead); }, [lettersRead,herRoute]);
  useEffect(() => { if(!herRoute)saveBlackHoleProgress(blackHoleProgress); }, [blackHoleProgress,herRoute]);
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
  const encounter = useWishEncounter(!herActive && !finishEyesOverride && !eyesHint && act === 'universe' && introDismissed && navigation.phase === 'GALAXY_IDLE');
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
      const eligible=!herActive&&!finishEyesOverride&&unlocked&&!eyesSeen&&!lettersFallback&&act==='universe'&&introDismissed&&navigationRef.current.phase==='GALAXY_IDLE'&&!encounter.invited;
      const active=!document.hidden&&document.hasFocus()&&now-lastEyeActivity.current<5000;
      const launch=eyeClock.current.tick(now-last,eligible,active);last=now;
      setEyesHint(eligible&&eyeClock.current.elapsed>=7000);
      if(launch && !eyeInteracting.current && eyeKeys.current.size===0 && now-lastEyeActivity.current>=500) {eyeClock.current.elapsed=0;startEyes();}
    },250);
    return()=>clearInterval(timer);
  },[herActive,finishEyesOverride,unlocked,eyesSeen,lettersFallback,act,introDismissed,encounter.invited,startEyes]);
  const [wishDelivered,setWishDelivered] = useState(false);
  const acceptWish = () => { if(!encounter.invited || navigationRef.current.phase !== 'GALAXY_IDLE') return; encounter.dismiss();setWishDelivered(false);travel('wish'); };
  const wishJourney = navigation.destination === 'wish' && navigation.phase !== 'GALAXY_IDLE';
  const shootingState = wishJourney ? wishDelivered && navigation.phase === 'WISH_ACTIVE' ? 'delivered' : 'held' : encounter.invited ? 'invited' : 'hidden';
  const chapter = ['lock','unlocking'].includes(act) ? 0 : ['narrative','scan','recognized','love'].includes(act) ? 1 : 2;
  const toggleSound = () => { try { setSound(!sound); setSoundState(!sound); if (!sound) feedback('tap'); } catch { setSoundState(false); } };
  if(herRoute&&herView&&remoteEnabled&&new URLSearchParams(window.location.search).get('preview')!=='local')return <Suspense fallback={<p role="status">Encontrando suas estrelas...</p>}><PublishedUniverse onReturn={()=>navigateHer(false)}/></Suspense>;
  if(herRoute&&herView&&(!herViewData.galaxy||!herActive))return <EmptyUniverseView onReturn={()=>navigateHer(false)}/>;
  if(herRoute&&!herProgress.accepted)return <section className="her-universe" style={{pointerEvents:'auto'}}><div className="nexus-dialog"><h1>Há um universo esperando por você.</h1><p>Comece pelo universo original. Cada estrela tem seu próprio tempo.</p><a href="/">Conhecer o universo original</a>{remoteEnabled&&<Suspense fallback={null}><CreatorRecovery/></Suspense>}</div></section>;
  return <div onPointerDownCapture={()=>{eyeInteracting.current=true;}} onPointerUpCapture={()=>{eyeInteracting.current=false;}} onPointerCancelCapture={()=>{eyeInteracting.current=false;}} onWheelCapture={()=>{lastEyeActivity.current=performance.now();}} onPointerMoveCapture={()=>{lastEyeActivity.current=performance.now();}} onKeyDownCapture={event=>{if(['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(event.key)){lastEyeActivity.current=performance.now();eyeKeys.current.add(event.key);}}} onKeyUpCapture={event=>{eyeKeys.current.delete(event.key);}} onBlurCapture={()=>{eyeKeys.current.clear();}} className={`${herActive&&herElements.journey?'her-hole-open':''} ${herActive&&herLetters.journey ? 'her-letter-active' : ''} ${herView ? 'her-view' : ''} ${herActive ? 'her-active' : ''} ${eyesActive ? 'eyes-open' : ''} experience act-${act} ${quizOpen ? 'quiz-open' : ''} ${coupleOpen ? 'couple-open' : ''} ${wishOpen ? 'wish-open' : ''} ${letterOpen ? 'letter-open' : ''} ${travelling ? 'is-travelling' : ''} ${gardenActive || returningFromGarden ? 'garden-open' : ''} ${gardenInvitation ? 'portal-prompt-open' : ''} ${blackHoleOpen || blackHoleJourney ? 'black-hole-open' : ''} ${introDismissed ? 'is-exploring' : ''} ${reduced ? 'reduced-motion' : ''}`} data-act={act} data-navigation={navigation.phase}>
    {herActive&&!herView&&remoteEnabled&&<Suspense fallback={null}><CreatorCloudPanel/></Suspense>}
    {herActive && herView && <ExplorationView data={herViewData} onReturn={()=>navigateHer(false)} onOpenQuiz={openHerQuiz} onOpenCouple={openHerCouple} quizOpen={herQuizOpen} coupleOpen={herCoupleOpen} quizAccess={herQuizAccess} coupleAccess={herCoupleAccess}/>}
    {herActive && !herView && <HerUniverse progress={herProgress} onChange={changeHer} reduced={reduced} storageFailed={storageFailed} travelReady={herTravelReady} creationReady={herCreationReady} quizOpen={herQuizOpen} onOpenQuiz={openHerQuiz} quizAccess={herQuizAccess} coupleOpen={herCoupleOpen} onOpenCouple={openHerCouple} coupleAccess={herCoupleAccess} onView={()=>navigateHer(true)}/>}<Ambient/>{(preload || act !== 'lock') && <Suspense fallback={null}><Cosmos {...(herActive?herLetters.canvasProps:{})} herElements={herActive?herElements.canvas:undefined} herView={herView} herCompatibilityAvailable={Boolean(herViewData.compatibility)} herCoupleAvailable={Boolean(herViewData.couple)} onHerCouple={openHerCouple} onHerCoupleProjection={projectHerCouple} herQuizOpen={herQuizOpen || herCoupleOpen || Boolean(herLetters.journey) || herLetters.editor || Boolean(herElements.journey)} onHerQuiz={openHerQuiz} onHerQuizProjection={projectHerQuiz} herUniverse={herActive ? herProgress : undefined} onHerArrived={herArrived} onHerCreated={herCreated} eyesWatched={eyesSeen} eyesHint={eyesHint} onEyesReady={readyEyes} onEyesProjection={projectEyes} act={act} scan={scan} reduced={reduced} onFormed={formed} shootingState={shootingState} onWish={acceptWish} onGarden={openGarden} onGardenProjection={projectGarden} onBlackHole={openBlackHole} onBlackHoleFragment={selectBlackHoleFragment} onBlackHoleAccessProjection={projectBlackHoleAccess} onBlackHoleProjection={projectBlackHole} blackHoleDiscovered={blackHoleProgress.discovered} blackHoleStarFormed={blackHoleProgress.starFormed} onBlackHoleStarFormed={blackHoleStarFormed} quizOpen={!herActive && (eyesActive || quizOpen || coupleOpen || letterOpen || wishOpen || gardenInvitation || gardenActive || blackHoleOpen)} compatibilityCompleted={quizCompleted} onCompatibility={openQuiz} onCouple={openCouple} navigation={herActive ? undefined : navigation} onTravelComplete={travelComplete} lettersRead={lettersRead} onLetter={travel} onLetterProjection={projectLetters} onLettersFallback={herActive?herFallback:onLettersFallback}/></Suspense>}
    {herActive&&herProgress.stage==='ready'&&!herQuizOpen&&!herCoupleOpen&&!herElements.journey&&herLetters.overlay}
    {herActive&&herProgress.stage==='ready'&&!herQuizOpen&&!herCoupleOpen&&!herLetters.editor&&!herLetters.journey&&herElements.overlay}
    {herActive&&!herView&&herProgress.stage==='ready'&&!herQuizOpen&&!herCoupleOpen&&!herLetters.editor&&!herLetters.journey&&!herElements.journey&&<div className="her-element-tools"><button onClick={herLetters.openEditor}>Adicionar carta</button><button onClick={herElements.openMenu}>Adicionar elemento</button><ElementOrganizer letters={{items:herLetters.letters,open:herLetters.open,locate:herLetters.locate,remove:herLetters.remove,error:herLetters.error}} holes={{items:herElements.holes,open:herElements.open,locate:herElements.locate,remove:herElements.remove,error:herElements.error}}/></div>}
    {herActive && !herView && herQuizOpen && <Suspense fallback={<p role="status">Abrindo sua constelação...</p>}><CompatibilityBuilder reduced={reduced} onExit={closeHerQuiz}/></Suspense>}
    {herActive && !herView && herCoupleOpen && <Suspense fallback={<p role="status">Abrindo seu desafio...</p>}><HerCoupleBuilder reduced={reduced} onExit={closeHerCouple}/></Suspense>}
    {herActive && herView && herQuizOpen && herViewData.compatibility && <Suspense fallback={<p role="status">Abrindo sua experiência...</p>}><ParticipantExperience kind="compatibility" questions={herViewData.compatibility} onExit={closeHerQuiz}/></Suspense>}
    {herActive && herView && herCoupleOpen && herViewData.couple && <Suspense fallback={<p role="status">Abrindo sua experiência...</p>}><ParticipantExperience kind="couple" questions={herViewData.couple} onExit={closeHerCouple}/></Suspense>}
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
    {eyesActive&&<EyesExperience ready={eyesReady} onExit={exitEyes} onAccept={acceptHer}/>}
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
    {travelling && <TravelOverlay destination={navigation.destination} phase={navigation.phase} text={navigation.phase === 'RETURN_TO_GALAXY' ? 'Voltando à galáxia' : navigation.phase === 'PORTAL_ENTRY' ? 'Atravessando o portal' : navigation.phase === 'BLACK_HOLE_ENTRY' ? 'Atravessando o horizonte de eventos' : navigation.destination === 'garden' ? 'Aproximando-se do jardim' : navigation.destination === 'black-hole' ? 'Aproximando-se do Buraco Negro dos Segredos' : navigation.destination === 'wish' ? 'Acompanhando a estrela cadente' : isLetterId(navigation.destination) ? `Encontrando ${lostLetters.find(letter => letter.id === navigation.destination)!.title}` : navigation.destination === 'couple' ? 'Viajando para Quiz de Casal' : 'Viajando para Compatibilidade'} buttonRef={skipAccess} onSkip={() => setNavigation(current => ({...current, skip:true}))}/>}
    <footer className="site-footer" inert={eyesActive || travelling || letterOpen || wishOpen || gardenJourney || blackHoleJourney}><span className="footer-note">{act === 'universe' ? c.galaxy.footer : c.footerNote}</span><ol className="chapters" aria-label="Atos da experiência">{c.labels.chapters.map((label,i) => <li key={label} className={i === chapter ? 'active' : i < chapter ? 'complete' : ''} aria-current={i === chapter ? 'step' : undefined}><span className="chapter-number">0{i+1}</span><span className="chapter-label">{label}</span></li>)}</ol><span className="footer-coordinate" aria-hidden="true">∞ &nbsp; / &nbsp; {c.coordinate}</span></footer>
  </div>;
}
