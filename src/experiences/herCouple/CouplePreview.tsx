import { ParticipantVisuals } from '../sharedQuiz/ParticipantVisuals';
import { useEffect, useRef, useState } from 'react';
import { coupleScore, isCorrectAnswer, type Question } from './model';
export function CouplePreview({questions,onExit,context='preview'}:{questions:Question[];onExit:()=>void;context?:'preview'|'visitor'}){
  const [index,setIndex]=useState(0),[selections,setSelections]=useState<Record<string,string[]>>({}),[answers,setAnswers]=useState<Record<string,string[]>>({}),[result,setResult]=useState<number|null>(null);
  const heading=useRef<HTMLHeadingElement>(null),feedback=useRef<HTMLDivElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[index,result]);
  const question=questions[index],selected=selections[question.id]??[],confirmed=Boolean(answers[question.id]);
  const choose=(id:string)=>setSelections(previous=>({...previous,[question.id]:[id]}));
  const confirm=()=>{if(!selected.length||confirmed)return;setAnswers(previous=>({...previous,[question.id]:[...selected]}));};
  useEffect(()=>{if(confirmed)feedback.current?.focus({preventScroll:true});},[confirmed,index]);
  return <section className="her-quiz-preview quiz-card couple-card her-participant-couple" aria-label={context==='visitor'?'Quiz Quanto Você Me Conhece?':'Prévia do Quiz de Casal'}>
    <p className="builder-kicker">{context==='visitor'?'RESPOSTAS NESTE NAVEGADOR':'MODO DE RESPOSTA · PRÉVIA LOCAL'}</p>
    <ParticipantVisuals index={index} total={questions.length} result={result} kind="couple"/>
    {result===null?<>
      <p>Pergunta {index+1} de {questions.length}</p><h2 key={`${index}-${result}`} className="her-question-heading" ref={heading} tabIndex={-1}>{question.text}</h2>
      <p>Escolha uma alternativa e confirme sua resposta.</p>
      <fieldset disabled={confirmed}><legend className="sr-only">Escolha uma resposta</legend>{question.options.map(option=><label className={`preview-option ${selected.includes(option.id)?'selected couple-selected':''}`} key={option.id}><input type="radio" name={question.id} checked={selected.includes(option.id)} onChange={()=>choose(option.id)}/><span>{option.text}</span></label>)}</fieldset>
      {!confirmed?<button className="builder-primary couple-primary" disabled={!selected.length} onClick={confirm}>Confirmar resposta</button>:<div className="couple-preview-feedback couple-feedback" ref={feedback} tabIndex={-1} role="status"><p>{isCorrectAnswer(question,answers[question.id])?'Resposta correta.':'Resposta incorreta.'}</p><p>Respostas corretas: {question.options.filter(option=>option.correct).map(option=>option.text).join(' · ')}</p>{question.comment.trim()&&<p className="couple-preview-comment">{question.comment}</p>}</div>}
      <div className="builder-actions quiz-actions"><button disabled={index===0} onClick={()=>setIndex(value=>value-1)}>Pergunta anterior</button>{index<questions.length-1?<button disabled={!confirmed} onClick={()=>setIndex(value=>value+1)}>Próxima pergunta</button>:<button disabled={!confirmed||!questions.every(question=>answers[question.id])} onClick={()=>setResult(coupleScore(questions,answers))}>Ver resultado</button>}</div>
    </>:<><h2 key={`${index}-${result}`} className="her-question-heading" ref={heading} tabIndex={-1}>Você me conhece: {result}%</h2><p>Você acertou {questions.filter(question=>isCorrectAnswer(question,answers[question.id])).length} de {questions.length} perguntas. Cada pergunta vale um ponto.</p><p>O resultado vai de 0% a 100%. Uma alternativa aceita pela criadora vale um ponto.</p><button className="quiz-restart" onClick={()=>{setIndex(0);setSelections({});setAnswers({});setResult(null);}}>Responder novamente</button></>}
    <button className="builder-link" onClick={onExit}>{context==='visitor'?'Fechar experiência':'Voltar ao editor'}</button>
  </section>;
}
