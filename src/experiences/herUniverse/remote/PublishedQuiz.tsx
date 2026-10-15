import { shuffleQuestions } from '../../herCompatibility/optionOrder';
import { useEffect, useRef, useState } from 'react';
import { ParticipantVisuals } from '../../sharedQuiz/ParticipantVisuals';
import { remoteRepository, type Correction, type Kind, type Publication } from './repository';
import '../../herCompatibility/builder.css';
import '../../herCouple/coupleBuilder.css';
export default function PublishedQuiz({publication,kind,onExit}:{publication:Publication;kind:Kind;onExit:()=>void}){
  const [questions,setQuestions]=useState(()=>kind==='compatibility'?shuffleQuestions(publication[kind]!):publication[kind]!),[index,setIndex]=useState(0),[selected,setSelected]=useState<Record<number,string>>({}),[confirmed,setConfirmed]=useState<Record<number,Correction>>({}),[result,setResult]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const modal=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null),feedback=useRef<HTMLDivElement>(null),attempt=useRef(''),lock=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;const node=modal.current!;node.showModal();return()=>{alive.current=false;node.close();};},[]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[index,result]);
  useEffect(()=>{if(confirmed[index])feedback.current?.focus({preventScroll:true});},[confirmed,index]);
  const response=confirmed[index],question=questions[index],title=kind==='couple'?'Quanto Você Me Conhece?':'Nossa Compatibilidade';
  const confirm=async()=>{
    if(lock.current||response||!selected[index])return;lock.current=true;setBusy(true);setError('');
    try{
      if(!attempt.current)attempt.current=(await remoteRepository.start(publication.id,kind)).attempt;
      const correction=await remoteRepository.answer(attempt.current,index,selected[index]);
      if(!correction.confirmed||(correction.result!==undefined&&(!Number.isInteger(correction.result)||correction.result<(kind==='couple'?0:25)||correction.result>100)))throw new Error('O serviço retornou uma correção inválida.');
      if(alive.current)setConfirmed(previous=>({...previous,[index]:correction}));
    }catch(error){if(alive.current)setError(error instanceof Error?error.message:'Não foi possível confirmar. Tente novamente.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  };
  const restart=()=>{if(kind==='compatibility')setQuestions(shuffleQuestions(publication[kind]!));attempt.current='';setIndex(0);setSelected({});setConfirmed({});setResult(null);setError('');};
  return <dialog ref={modal} className={`compatibility-builder participant-experience participant-${kind}`} aria-label={title} onCancel={event=>{event.preventDefault();onExit();}}>
    <header className="builder-header"><div><p className="builder-kicker">UNIVERSO PUBLICADO · PARTICIPANTE</p><h1>{title}</h1></div><button onClick={onExit}>Voltar à galáxia</button></header>
    <div className="builder-content"><section className={`her-quiz-preview quiz-card ${kind==='couple'?'couple-card her-participant-couple':'her-participant-compatibility'}`} aria-label={`Quiz ${title}`}>
      <ParticipantVisuals index={index} total={questions.length} result={result} kind={kind}/>
      {result===null?<><p>Pergunta {index+1} de {questions.length}</p><h2 key={index} className="her-question-heading" ref={heading} tabIndex={-1}>{question.text}</h2><p>Escolha uma alternativa e confirme sua resposta.</p>
        <fieldset disabled={busy||Boolean(response)}><legend className="sr-only">Escolha uma resposta</legend>{question.options.map(option=><label className={`preview-option ${selected[index]===option.id?'selected couple-selected':''}`} key={option.id}><input type="radio" name={question.id} checked={selected[index]===option.id} onChange={()=>setSelected(previous=>({...previous,[index]:option.id}))}/><span>{option.text}</span></label>)}</fieldset>
        {!response?<button className="couple-primary" disabled={busy||!selected[index]} onClick={()=>void confirm()}>{busy?'Confirmando...':'Confirmar resposta'}</button>:<div className="remote-quiz-feedback" role="status" ref={feedback} tabIndex={-1}>{kind==='couple'?<><p>{response.correct?'Resposta correta.':'Resposta incorreta.'}</p><p>Respostas corretas: {response.correctOptions?.map(o=>o.text).join(' · ')}</p>{response.comment&&<p className="couple-preview-comment">{response.comment}</p>}</>:<p>Resposta confirmada.</p>}</div>}
        <div className="builder-actions quiz-actions"><button disabled={busy||index===0} onClick={()=>{setError('');setIndex(index-1);}}>Pergunta anterior</button><button disabled={busy||!response||(index===questions.length-1&&response.result===undefined)} onClick={()=>{setError('');if(index===questions.length-1)setResult(response.result!);else setIndex(index+1);}}>{index===questions.length-1?'Ver resultado':'Próxima pergunta'}</button></div>
      </>:<><h2 ref={heading} tabIndex={-1}>{kind==='couple'?'Você me conhece':'Compatibilidade'}: {result}%</h2><p>{kind==='couple'?'Cada alternativa aceita pela criadora vale um ponto. Resultado entre 0% e 100%.':'Afinidade calculada conforme as preferências da criadora. Escala entre 25% e 100%.'}</p><button className="quiz-restart" onClick={restart}>Responder novamente</button></>}
      {error&&<p role="alert">{error}</p>}<button className="builder-link" onClick={onExit}>Fechar experiência</button>
    </section></div>
  </dialog>;
}
