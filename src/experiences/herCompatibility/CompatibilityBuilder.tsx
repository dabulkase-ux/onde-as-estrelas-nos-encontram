import { RemoteSaveStatus } from '../herUniverse/remote/RemoteSaveStatus';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NexusSpeech } from '../herUniverse/NexusSpeech';
import { canComplete, limits, moveQuestion, newQuestion, validQuestion, type Question, type QuizDraft, type Weight } from './model';
import { quizRepository } from './repository';
import { QuizPreview } from './QuizPreview';
import { remoteEnabled } from '../herUniverse/remote/repository';
import './builder.css';
export const builderIntroduction = [
  'Olha só… parece que uma das suas estrelas também consegue medir a compatibilidade entre dois universos.',
  'O chefe já criou o teste dele. Mas agora chegou a sua vez de decidir quais respostas combinam mais com você.',
  'Você cria as perguntas, escreve quatro alternativas e dá a cada uma um peso de 1 a 4. Quanto maior o peso, mais aquela resposta combina com o que você gosta.',
  'Precisamos de pelo menos cinco perguntas. Depois disso, a criatividade é toda sua.',
];
const pageSize=8;
const localSaveStatus=remoteEnabled?'Rascunho atualizado neste navegador. Publique quando estiver pronta.':'Cache local atualizado.';
export default function CompatibilityBuilder({ reduced, onExit }: { reduced: boolean; onExit: () => void }) {
  const [loaded]=useState(quizRepository.load);
  const [draft,setDraft]=useState(loaded.draft);
  const [loadBlocked,setLoadBlocked]=useState(Boolean(loaded.error));
  const [view,setView]=useState<'intro'|'editor'|'preview'|'confirmation'>(()=>!loaded.draft.introSeen?'intro':loaded.draft.status==='completed'?'confirmation':'editor');
  const [intro,setIntro]=useState(0),[selected,setSelected]=useState(()=>loaded.draft.questions[0]?.id??''),[listPage,setListPage]=useState(0);
  const [deleting,setDeleting]=useState(false),[saving,setSaving]=useState(loaded.error??localSaveStatus);
  const modal=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null);
  const latest=useRef(draft);latest.current=draft;
  const blocked=useRef(loadBlocked);blocked.current=loadBlocked;
  const save=useCallback((next:QuizDraft)=>{if(blocked.current)return false;const result=quizRepository.save(next);setSaving(result.ok?localSaveStatus:result.error);return result.ok;},[]);
  useEffect(()=>{const node=modal.current!;node.showModal();return()=>node.close();},[]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[view,selected]);
  useEffect(()=>{
    if(loadBlocked)return;
    setSaving(remoteEnabled?'Atualizando backup local…':'Atualizando cache local…');const timer=setTimeout(()=>save(draft),350);return()=>clearTimeout(timer);
  },[draft,save,loadBlocked]);
  useEffect(()=>{
    const flush=()=>{if(!blocked.current)quizRepository.save(latest.current);};
    const visibility=()=>{if(document.hidden)flush();};
    window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',visibility);
    return()=>{flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const index=draft.questions.findIndex(question=>question.id===selected),question=draft.questions[index];
  const validCount=useMemo(()=>draft.questions.filter(validQuestion).length,[draft.questions]);
  const complete=canComplete(draft.questions);
  const previewQuestions=useMemo(()=>draft.questions.filter(validQuestion),[draft.questions]);
  const update=(questions:Question[])=>setDraft(previous=>({...previous,questions,status:'draft'}));
  const changeQuestion=(next:Question)=>update(draft.questions.map(question=>question.id===next.id?next:question));
  const add=()=>{const next=newQuestion();update([...draft.questions,next]);setSelected(next.id);setListPage(Math.floor(draft.questions.length/pageSize));};
  const select=(id:string)=>{setSelected(id);setDeleting(false);};
  const pages=Math.max(1,Math.ceil(draft.questions.length/pageSize)),page=Math.min(listPage,pages-1);
  const close=()=>{if(!save(latest.current)&&!(blocked.current&&latest.current.questions.length===0))return;modal.current?.close();onExit();};
  return <dialog ref={modal} className="compatibility-builder" aria-label="Nossa Compatibilidade" onCancel={event=>{event.preventDefault();close();}}>
    <header className="builder-header"><div><p className="builder-kicker">SEU UNIVERSO · {view==='preview'?'PARTICIPANTE':'CRIADORA'}</p><h1 id="her-builder-title" ref={heading} tabIndex={-1}>Nossa Compatibilidade</h1></div><button onClick={close} aria-label="Voltar ao meu universo">Voltar ao universo</button></header>
    <div className="builder-content">
      {loadBlocked && <aside role="alert"><p>{loaded.error} Para começar um rascunho novo, você precisará substituir esses dados locais.</p><button onClick={()=>{setLoadBlocked(false);blocked.current=false;save(draft);}}>Substituir rascunho ilegível</button></aside>}
      {view==='intro' && <section className="builder-intro"><div className="nexus-avatar" aria-hidden="true"><div className="nexus-orbit"/><div className="nexus-core"><i/><i/></div></div><p className="nexus-name">NEXUS</p><NexusSpeech key={intro} text={builderIntroduction[intro]} reduced={reduced} onContinue={()=>{if(intro<3)setIntro(value=>value+1);else{setDraft(previous=>({...previous,introSeen:true}));setView('editor');}}}/></section>}
      {view==='editor' && <>
        <div className="builder-summary"><p role="status">{validCount} perguntas válidas de {draft.questions.length} criadas{validCount<5?` — faltam ${5-validCount} para concluir`:'.'}</p><p>Quatro alternativas por pergunta. Cada alternativa tem seu próprio peso de 1 a 4; você pode repetir pesos.</p></div>
        <div className="builder-workspace">
          <nav className="builder-question-list" aria-label="Suas perguntas"><button className="builder-primary" onClick={add}>Nova pergunta</button>{draft.questions.slice(page*pageSize,(page+1)*pageSize).map((question,offset)=><button key={question.id} aria-current={question.id===selected?'step':undefined} onClick={()=>select(question.id)}><span>{page*pageSize+offset+1}. {question.text.trim()||'Pergunta sem título'}</span><small>{validQuestion(question)?'Pronta':'Em edição'}</small></button>)}{pages>1&&<div className="builder-pagination"><button aria-label="Página anterior de perguntas" disabled={page===0} onClick={()=>setListPage(page-1)}>Anterior</button><span>{page+1}/{pages}</span><button aria-label="Próxima página de perguntas" disabled={page===pages-1} onClick={()=>setListPage(page+1)}>Próxima</button></div>}</nav>
          {question ? <section className="question-editor" aria-label={`Editar pergunta ${index+1}`}>
            <div className="question-editor-heading"><h2>Pergunta {index+1}</h2><span>{validQuestion(question)?'Pronta para a prévia':'Preencha o enunciado e as quatro alternativas'}</span></div>
            <label className="builder-field">Enunciado<textarea value={question.text} maxLength={limits.question} rows={3} onChange={event=>changeQuestion({...question,text:event.target.value})}/></label>
            <small>{question.text.length}/{limits.question} caracteres</small>
            <div className="builder-options">{question.options.map((option,optionIndex)=><fieldset key={option.id}><legend>Alternativa {optionIndex+1}</legend><label className="builder-field">Texto da alternativa {optionIndex+1}<textarea rows={2} value={option.text} maxLength={limits.option} onChange={event=>changeQuestion({...question,options:question.options.map(existing=>existing.id===option.id?{...existing,text:event.target.value}:existing) as Question['options']})}/></label><label className="builder-field weight-field">Peso da alternativa {optionIndex+1}<select value={option.weight} onChange={event=>changeQuestion({...question,options:question.options.map(existing=>existing.id===option.id?{...existing,weight:Number(event.target.value) as Weight}:existing) as Question['options']})}>{[1,2,3,4].map(weight=><option value={weight} key={weight}>{weight}</option>)}</select></label></fieldset>)}</div>
            <div className="builder-actions"><button disabled={index===0} onClick={()=>{update(moveQuestion(draft.questions,question.id,-1));setListPage(Math.floor((index-1)/pageSize));}}>Mover para cima</button><button disabled={index===draft.questions.length-1} onClick={()=>{update(moveQuestion(draft.questions,question.id,1));setListPage(Math.floor((index+1)/pageSize));}}>Mover para baixo</button><button onClick={()=>setDeleting(true)}>Excluir pergunta</button></div>
            {deleting && <div className="builder-delete" role="alert"><p>Excluir esta pergunta e suas quatro alternativas?</p><button onClick={()=>{const next=draft.questions.filter(existing=>existing.id!==question.id);update(next);setSelected(next[Math.min(index,next.length-1)]?.id??'');setDeleting(false);}}>Confirmar exclusão</button><button onClick={()=>setDeleting(false)}>Cancelar exclusão</button></div>}
          </section> : <section className="builder-empty"><h2>Seu quiz começa com uma pergunta.</h2><p>Escreva do seu jeito. O rascunho pode ser salvo antes de estar pronto.</p></section>}
        </div>
        <div className="builder-actions builder-final-actions"><button onClick={()=>save(draft)}>{remoteEnabled?'Atualizar backup local':'Salvar rascunho'}</button><button disabled={!previewQuestions.length} onClick={()=>setView('preview')}>Prévia como participante</button><button className="builder-primary" disabled={!complete || loadBlocked} onClick={()=>{const next={...draft,status:'completed' as const};if(save(next)){setDraft(next);setView('confirmation');}}}>Concluir quiz</button></div>
        {!complete && <p className="builder-help">Para concluir, crie pelo menos cinco perguntas e complete todas as perguntas adicionadas. A prévia mostra apenas as perguntas válidas.</p>}
      </>}
      {view==='preview' && <QuizPreview questions={previewQuestions} onExit={()=>setView('editor')}/>}
      {view==='confirmation' && <section className="builder-confirmation"><h2>Seu quiz está pronto.</h2><p>Você criou {draft.questions.length} perguntas para descobrir como dois universos combinam.</p><p>{remoteEnabled?'O quiz está guardado neste navegador. Use Salvar e publicar para enviá-lo ao Supabase e disponibilizá-lo aos visitantes.':'O quiz está salvo somente neste navegador. Ainda não foi publicado nem sincronizado com outros dispositivos.'}</p><div className="builder-actions"><button onClick={()=>setView('preview')}>Responder meu quiz</button><button onClick={()=>{setDraft(previous=>({...previous,status:'draft'}));setView('editor');}}>Editar meu quiz</button><button className="builder-primary" onClick={close}>Voltar ao meu universo</button></div></section>}
      <p className="builder-save-status" role="status">{saving}</p><RemoteSaveStatus localSaving={saving==='Atualizando cache local…'||saving==='Atualizando backup local…'}/>
    </div>
  </dialog>;
}
