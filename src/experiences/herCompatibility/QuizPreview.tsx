import { shuffleQuestions } from './optionOrder';
import { ParticipantVisuals } from '../sharedQuiz/ParticipantVisuals';
import { useEffect, useRef, useState } from 'react';
import { compatibilityScore, type Question } from './model';
export function QuizPreview({ questions, onExit, context='preview' }: { questions: Question[]; onExit: () => void; context?: 'preview'|'visitor' }) {
  const [orderedQuestions,setOrderedQuestions]=useState(()=>shuffleQuestions(questions));
  const [index,setIndex]=useState(0), [answers,setAnswers]=useState<Record<string,string>>({}), [result,setResult]=useState<number|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[index,result]);
  const question=orderedQuestions[index];
  return <section className="her-quiz-preview quiz-card  her-participant-compatibility" aria-label={context==='visitor'?'Quiz Nossa Compatibilidade':'Prévia como participante'}>
    <p className="builder-kicker">{context==='visitor'?'RESPOSTAS NESTE NAVEGADOR':'MODO DE RESPOSTA · PRÉVIA LOCAL'}</p>
    <ParticipantVisuals index={index} total={questions.length} result={result} kind="compatibility"/>
    {result === null ? <>
      <p>Pergunta {index+1} de {questions.length}</p>
      <h2 key={`${index}-${result}`} className="her-question-heading" ref={heading} tabIndex={-1}>{question.text}</h2>
      <fieldset><legend className="sr-only">Escolha sua resposta</legend>{question.options.map(option=><label className={`preview-option ${answers[question.id]===option.id?'selected':''}`} key={option.id}><input type="radio" name={question.id} checked={answers[question.id]===option.id} onChange={()=>setAnswers(previous=>({...previous,[question.id]:option.id}))}/><span>{option.text}</span></label>)}</fieldset>
      <div className="builder-actions quiz-actions"><button disabled={index===0} onClick={()=>setIndex(value=>value-1)}>Pergunta anterior</button>{index<questions.length-1?<button disabled={!answers[question.id]} onClick={()=>setIndex(value=>value+1)}>Próxima pergunta</button>:<button disabled={!answers[question.id] || !questions.every(question=>answers[question.id])} onClick={()=>setResult(compatibilityScore(questions,answers))}>Ver resultado</button>}</div>
    </> : <><h2 key={`${index}-${result}`} className="her-question-heading" ref={heading} tabIndex={-1}>Compatibilidade: {result}%</h2><p>Os pesos das suas respostas somaram {questions.reduce((sum,question)=>sum+(question.options.find(option=>option.id===answers[question.id])?.weight??0),0)} de {questions.length*4} pontos.</p><p>A escala possível vai de 25% a 100%, conforme as alternativas e os pesos definidos pela criadora.</p><button className="quiz-restart" onClick={()=>{setOrderedQuestions(shuffleQuestions(questions));setIndex(0);setAnswers({});setResult(null);}}>Responder novamente</button></>}
    <button className="builder-link" onClick={onExit}>{context==='visitor'?'Fechar experiência':'Voltar ao editor'}</button>
  </section>;
}
