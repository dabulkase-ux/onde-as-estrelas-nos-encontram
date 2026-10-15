import { useEffect, useRef } from 'react';
import { QuizPreview } from '../../herCompatibility/QuizPreview';
import { CouplePreview } from '../../herCouple/CouplePreview';
import type { Question as CompatibilityQuestion } from '../../herCompatibility/model';
import type { Question as CoupleQuestion } from '../../herCouple/model';
import '../../herCompatibility/builder.css';
import '../../herCouple/coupleBuilder.css';
type Props=({kind:'compatibility';questions:CompatibilityQuestion[]}|{kind:'couple';questions:CoupleQuestion[]})&{onExit:()=>void};
export default function ParticipantExperience(props:Props) {
  const modal=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const node=modal.current!;node.showModal();return()=>node.close();},[]);
  const close=()=>{modal.current?.close();props.onExit();};
  const title=props.kind==='compatibility'?'Nossa Compatibilidade':'Quanto Você Me Conhece?';
  return <dialog ref={modal} className={`compatibility-builder participant-experience participant-${props.kind}`} aria-label={title} onCancel={event=>{event.preventDefault();close();}}>
    <header className="builder-header"><div><p className="builder-kicker">MODO VISÃO · PARTICIPANTE</p><h1>{title}</h1></div><button onClick={close}>Voltar à galáxia</button></header>
    <div className="builder-content">{props.kind==='compatibility'?<QuizPreview questions={props.questions} onExit={close} context="visitor"/>:<CouplePreview questions={props.questions} onExit={close} context="visitor"/>}</div>
  </dialog>;
}
