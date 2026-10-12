import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../core/useReducedMotion';
import { finalDeclaration, finalPhrase, firstDeclaration, questions, secretPrelude } from './data';
import { emptyProgress, readProgress, saveProgress, score, shuffle } from './logic';
import { QuizVisuals } from './QuizVisuals';
import './quiz.css';
import { createQuizCompletionSender } from '../../services/quizSharing';
type Stage = 'questions' | 'calculation' | 'percentage' | 'declaration' | 'secret' | 'merge' | 'final';
export default function CompatibilityQuiz({ onExit }: { onExit: () => void }) {
 const [sharing] = useState(createQuizCompletionSender);
 const completed = useRef(false);
 const [progress, setProgress] = useState(readProgress);
 const [stage, setStage] = useState<Stage>(progress.completed ? 'declaration' : 'questions');
 const [index, setIndex] = useState(() => Math.max(0, progress.answers.findIndex(a => a === null)));
 const [orders, setOrders] = useState(() => questions.map(q => shuffle(q.options)));
 const [line, setLine] = useState(0); const [storageFailed, setStorageFailed] = useState(false);
 const navigating = useRef(false);
 const travelMessage = stage === 'questions' && index === 1 && progress.answers[index] === '1-1';
 const [exiting, setExiting] = useState(false);
 const reduced = useReducedMotion(); const heading = useRef<HTMLHeadingElement>(null); const scroll = useRef<HTMLDivElement>(null);
 useEffect(() => { setStorageFailed(!saveProgress(progress)); }, [progress]);
 useEffect(() => { navigating.current = false; heading.current?.focus(); scroll.current?.scrollTo(0, 0); }, [stage, index]);
 useEffect(() => {
  if (stage !== 'secret' || reduced || line >= secretPrelude.length - 1) return;
  const timer = setTimeout(() => setLine(n => n + 1), 4800); return () => clearTimeout(timer);
 }, [stage, line, reduced]);
 useEffect(() => { if (!exiting) return; const timer = setTimeout(onExit, reduced ? 0 : 500); return () => clearTimeout(timer); }, [exiting, onExit, reduced]);
 const choose = (id: string) => {
  if (exiting || navigating.current) return;
  setProgress(p => ({ ...p, answers: p.answers.map((a, i) => i === index ? id : a) }));
 };
 const navigate = (nextIndex: number) => {
  if (navigating.current || exiting) return;
  navigating.current = true; setIndex(nextIndex);
 };
 const exit = () => setExiting(true);
 const restart = () => { completed.current = false; sharing.reset(); setProgress(emptyProgress()); setIndex(0); setOrders(questions.map(q => shuffle(q.options))); setStage('questions'); setLine(0); };
 const finish = () => { if (completed.current || exiting) return; score(progress.answers); completed.current = true; sharing.complete({kind:'compatibility',answers:progress.answers as string[]}); setProgress(p => ({ ...p, completed: true })); setStage('calculation'); };
 const paragraphs = stage === 'declaration' ? firstDeclaration : finalDeclaration;
 return <section className={`compatibility-quiz stage-${stage} ${exiting ? 'quiz-exiting' : ''}`} aria-label="Quiz de compatibilidade" onKeyDown={event => { if (event.key === 'Escape') exit(); }}>
  <div className={`quiz-toast-space ${stage === 'questions' && index === 1 ? 'has-travel-toast' : ''}`}>
   <aside className={`quiz-travel-toast ${travelMessage && !exiting ? 'is-visible' : ''}`} aria-hidden={!travelMessage || exiting} role="status" aria-atomic="true"><p className="quiz-toast-title">Só uma coisinha...</p><p>Poxa, deixa o Canadá ter um espaço na nossa vida também...</p></aside>
  </div>
  <div className="quiz-scroll" ref={scroll}><div className="quiz-card">
   <div className="quiz-top"><span className="eyebrow">Compatibilidade</span><button onClick={exit}>Voltar à galáxia</button></div>
   <QuizVisuals stage={stage}/>
   {stage === 'questions' ? <>
    <p className="quiz-progress">Pergunta {index + 1} de 10</p><progress value={index + 1} max={10} aria-label="Progresso do quiz"/>
    <h2 ref={heading} tabIndex={-1}>{questions[index].text}</h2>
    <fieldset disabled={exiting}><legend className="sr-only">Escolha a preferência que mais combina com você</legend>{orders[index].map(option => <label key={option.id} className={progress.answers[index] === option.id ? 'selected' : ''}><input type="radio" name={`question-${index}`} checked={progress.answers[index] === option.id} onChange={() => choose(option.id)}/><span>{option.text}</span></label>)}</fieldset>
    <div className="quiz-actions"><button disabled={index === 0 || exiting} onClick={event => { if (event.detail <= 1) navigate(index - 1); }}>Voltar</button><button disabled={!progress.answers[index] || exiting} onClick={event => { if (event.detail > 1) return; if (index === 9) finish(); else navigate(index + 1); }}>{index === 9 ? 'Revelar nossa afinidade' : 'Continuar'}</button></div>
   </> : <>
    <h2 ref={heading} tabIndex={-1} className={stage === 'percentage' ? 'quiz-percentage' : 'sr-only'}>{stage === 'percentage' ? `${score(progress.answers)}%` : stage === 'final' ? 'Nossa escolha' : 'Entre tantas estrelas'}</h2>
    {stage === 'calculation' && <><p className="quiz-cinematic">Dez perguntas. Dez pequenos pedaços de quem somos...</p><button className="quiz-primary" onClick={() => setStage('percentage')}>Ver nossa porcentagem</button></>}
    {stage === 'percentage' && <><p className="quiz-cinematic">Essa é a porcentagem das nossas preferências que caminham na mesma direção.</p><p className="quiz-note">Uma afinidade de preferências, sem respostas certas ou erradas. Não é uma avaliação científica do relacionamento.</p><button className="quiz-primary" onClick={() => setStage('declaration')}>Continuar</button></>}
    {(stage === 'declaration' || stage === 'final') && <div className="quiz-declaration">{paragraphs.map((text, i) => <p key={text} style={{ animationDelay: `${i * .65}s` }}>{text}</p>)}{stage === 'final' && <p className="quiz-final" style={{ animationDelay: '3.5s' }}>{finalPhrase}</p>}</div>}
    {stage === 'declaration' && <button className="quiz-primary" onClick={() => { setLine(0); setStage('secret'); }}>E se eu pudesse escolher de novo?</button>}
    {stage === 'secret' && <><p className="quiz-cinematic" key={line} aria-live="polite">{secretPrelude[line]}</p><button className="quiz-primary" onClick={() => line < 3 ? setLine(n => n + 1) : setStage('merge')}>Continuar</button></>}
    {stage === 'merge' && <><p className="quiz-cinematic">Mas se o universo me desse a chance de começar tudo outra vez...</p><button className="quiz-primary" onClick={() => setStage('final')}>Descobrir nossa escolha</button></>}
    {stage === 'final' && <button className="quiz-primary" onClick={exit}>Voltar ao nosso universo</button>}
    {progress.completed && <button className="quiz-restart" onClick={restart}>Reiniciar apenas o quiz</button>}
   </>}
   {storageFailed && <p className="quiz-note" role="status">Seu navegador não permitiu salvar. Você pode continuar nesta visita.</p>}
  </div></div>
 </section>;
}


