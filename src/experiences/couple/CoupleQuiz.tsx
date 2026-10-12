import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../core/useReducedMotion';
import { QuizVisuals } from '../compatibility/QuizVisuals';
import { acceptanceFooter, acceptanceMessage, acceptanceTitle, coupleQuestions, lastStar, letters, letterTitle, loveLetter, type Letter } from './data';
import { emptyCoupleProgress, getAnswerFeedback, readCoupleProgress, saveCoupleProgress } from './logic';
import { Invitation } from './Invitation';
import './couple.css';
import { SaveSubmission } from '../../components/SaveSubmission';
import { createQuizCompletionSender } from '../../services/quizSharing';
import { savingAvailable } from '../../services/supabase';
type Stage = 'questions' | 'last-star' | 'letter' | 'invitation' | 'accepted' | 'revisit';
export default function CoupleQuiz({onExit}: {onExit: () => void}) {
 const [sharing] = useState(createQuizCompletionSender);
 const [progress, setProgress] = useState(readCoupleProgress);
 const [stage, setStage] = useState<Stage>(() => progress.completed ? 'revisit' : 'questions');
 const [index, setIndex] = useState(() => { const next = progress.answers.findIndex(a => a === null); return next < 0 ? 9 : next; });
 const [exiting, setExiting] = useState(false); const [storageFailed, setStorageFailed] = useState(false);
 const [revealed, setRevealed] = useState(1); const [celebrated, setCelebrated] = useState(false);
 const [noAttempts, setNoAttempts] = useState(0);
 const [choice, setChoice] = useState<'yes' | 'no' | 'later' | null>(null);
 const reduced = useReducedMotion(); const heading = useRef<HTMLHeadingElement>(null); const scroll = useRef<HTMLDivElement>(null);
 const answered = useRef(false); const busy = useRef(false); const exitCallback = useRef(onExit);
 useEffect(() => { exitCallback.current = onExit; }, [onExit]);
 useEffect(() => { setStorageFailed(!saveCoupleProgress(progress)); }, [progress]);
 useEffect(() => { busy.current = false; answered.current = false; heading.current?.focus({preventScroll:true}); scroll.current?.scrollTo(0,0); }, [stage,index]); // Answer lock is released only when the scene changes.
 useEffect(() => { if (!exiting) return; const timer = setTimeout(() => exitCallback.current(), reduced ? 0 : 450); return () => clearTimeout(timer); }, [exiting,reduced]);
 useEffect(() => {
  if (stage !== 'letter' || reduced || revealed >= loveLetter.length) return;
  const timer = setTimeout(() => setRevealed(n => Math.min(n+1,loveLetter.length)),2200);
  return () => clearTimeout(timer);
 }, [stage,revealed,reduced]);
 useEffect(() => {
  if (stage !== 'accepted') return;
  if (reduced) { setCelebrated(true); return; }
  const timer = setTimeout(() => setCelebrated(true),3200); return () => clearTimeout(timer);
 }, [stage,reduced]);
 const go = (next: Stage) => { if (busy.current || exiting) return; busy.current = true; setStage(next); };
 const openLetter = () => { setRevealed(1); go('letter'); };
 const restart = () => { sharing.reset(); answered.current = false; setProgress(emptyCoupleProgress()); setIndex(0); setRevealed(1); setCelebrated(false); setNoAttempts(0); setChoice(null); go('questions'); };
 const choose = (answer: Letter) => {
  if (progress.answers[index] !== null || answered.current || exiting) return; answered.current = true;
  setProgress(p => ({...p,answers:p.answers.map((old,i) => i === index ? answer : old)}));
 };
 const next = () => {
  if (!progress.answers[index] || busy.current || exiting) return; busy.current = true;
  if (index < 9) setIndex(i => i+1);
  else { sharing.complete({kind:'couple',answers:progress.answers as string[]}); setProgress(p => ({...p,completed:true})); setStage('last-star'); }
 };
 const answer = progress.answers[index]; const q = coupleQuestions[index];
 const answerFeedback = answer ? getAnswerFeedback(index, answer) : null;
 const shown = reduced ? loveLetter.length : revealed;
 const title = stage === 'questions' ? q.text : stage === 'letter' ? letterTitle : stage === 'invitation' ? 'Aceita ficar comigo?' : stage === 'accepted' ? acceptanceTitle : stage === 'last-star' ? lastStar : 'Nossas pequenas estrelas';
 return <section className={`couple-quiz couple-stage-${stage} ${exiting ? 'couple-exiting' : ''}`} aria-label="Quiz de Casal" onKeyDown={event => { if(event.key === 'Escape') setExiting(true); }}>
  <div className="couple-scroll" ref={scroll}><div className="couple-card" inert={exiting}>
   <header className="couple-top"><p className="eyebrow">Quiz de Casal</p><button onClick={() => setExiting(true)}>Voltar à galáxia</button></header>
   <QuizVisuals stage={stage === 'questions' ? 'questions' : stage === 'accepted' ? 'calculation' : stage === 'invitation' ? 'secret' : 'declaration'}/>
   {stage === 'questions' && <><p className="couple-progress">{String(index+1).padStart(2,'0')}/10</p><progress value={index+1} max={10} aria-label="Progresso do Quiz de Casal"/></>}
   <h2 ref={heading} tabIndex={-1}>{title}</h2>
   {stage === 'questions' && <>
    <fieldset disabled={answer !== null}><legend className="sr-only">Escolha uma das quatro alternativas</legend>{q.options.map((text,i) => <label key={`${index}-${letters[i]}`} className={answer === letters[i] ? 'couple-selected' : ''}><input type="radio" name={`couple-${index}`} checked={answer === letters[i]} onChange={() => choose(letters[i])}/><span><b>{letters[i]}.</b> {text}</span></label>)}</fieldset>
    {answerFeedback && <div className={`couple-feedback couple-feedback-${answerFeedback.kind}`} data-feedback-kind={answerFeedback.kind} role="status"><p>{answerFeedback.text}</p>{answerFeedback.kind === 'standard' && <p className="couple-answer">A resposta que eu tinha em mente: {q.correct}. {q.options[letters.indexOf(q.correct)]}</p>}</div>}
    <button className="couple-primary" disabled={!answer} onClick={next}>{index === 9 ? 'Seguir para a última estrela' : 'Próxima estrela'}</button>
   </>}
   {stage === 'last-star' && <button className="couple-primary" onClick={openLetter}>Ler sua carta</button>}
   {stage === 'letter' && <>
    <article className="couple-letter" aria-label={letterTitle}>{loveLetter.slice(0,shown).map(text => <p key={text}>{text}</p>)}</article>
    {shown < loveLetter.length ? <button className="couple-secondary" onClick={() => setRevealed(loveLetter.length)}>Mostrar a carta inteira</button> : <button className="couple-primary" onClick={() => go('invitation')}>Ainda tem uma última coisa…</button>}
   </>}
   {stage === 'invitation' && <>
    {savingAvailable && <p className="couple-note">Você pode autorizar o envio da sua escolha e das tentativas no botão Não ao proprietário. Nada será enviado automaticamente.</p>}
    <Invitation reduced={reduced} onAttempt={() => setNoAttempts(n => n+1)} onChoice={() => setChoice('no')} onAccept={() => { setChoice('yes'); setCelebrated(false); go('accepted'); }}/>
    <button className="couple-secondary" onClick={() => setChoice('later')}>Deixar para depois</button>
    {choice === 'later' && <p className="couple-note" role="status">Você pode voltar quando quiser.</p>}
    <button className="couple-secondary" onClick={() => setExiting(true)}>Voltar ao nosso universo</button>
   </>}
   {stage === 'accepted' && <><div className="couple-letter couple-celebration">{acceptanceMessage.map((text,i) => <p key={text} style={{animationDelay:`${i*.7}s`}}>{text}</p>)}</div><p className="couple-footer">{acceptanceFooter}</p>{celebrated && <button className="couple-primary" onClick={() => setExiting(true)}>Explorar nosso universo</button>}</>}
   {stage === 'revisit' && <><p className="couple-note">Este pedacinho do universo continua aqui para você.</p><button className="couple-primary" onClick={openLetter}>Reler a declaração</button><button className="couple-secondary" onClick={restart}>Iniciar o Quiz de Casal novamente</button></>}
   {choice && (stage === 'invitation' || stage === 'accepted') && <SaveSubmission key={choice} payload={{kind:'proposal',attempts:noAttempts,choice}}/>}
   {storageFailed && <p className="couple-note" role="status">Seu navegador não permitiu salvar. Você pode continuar nesta visita.</p>}
  </div></div>
 </section>;
}


