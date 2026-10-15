import { useEffect, useRef, useState } from 'react';
import { eyesPhrase } from './progress';
import './eyes.css';
export function EyesExperience({ready,onExit,onAccept}:{ready:boolean;onExit:()=>void;onAccept:()=>void}) {
  const [invited,setInvited]=useState(false);
  const [declined,setDeclined]=useState(false);
  const exit=useRef<HTMLButtonElement>(null);
  useEffect(()=>{exit.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{
    if(!ready)return;
    // This romantic confirmation is part of the story. Only its affirmative
    // button starts the Nexus journey; contemplation must never auto-accept.
    const timer=setTimeout(()=>setInvited(true),4500);
    return()=>clearTimeout(timer);
  },[ready]);
  return <section className="eyes-experience" role="dialog" aria-modal="true" aria-label="Constelação dos Olhos">
    {ready && <p className="eyes-phrase" role="status">{eyesPhrase}</p>}
    {invited && <div className="eyes-invitation" aria-live="polite">{declined ? <p>Tudo bem. Obrigado por conhecer o meu universo.</p> : <><p>Eu te mostrei o meu universo… será que posso conhecer o seu também?</p><div><button onClick={onAccept}>Sim, pode</button><button onClick={()=>setDeclined(true)}>Agora não</button></div></>}</div>}
    <button ref={exit} onClick={onExit}>Voltar à galáxia</button>
  </section>;
}
