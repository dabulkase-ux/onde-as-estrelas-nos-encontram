import { useEffect, useRef } from 'react';
import { eyesPhrase } from './progress';
import './eyes.css';
export function EyesExperience({ready,onExit}:{ready:boolean;onExit:()=>void}) {
  const exit=useRef<HTMLButtonElement>(null);
  useEffect(()=>{exit.current?.focus({preventScroll:true});},[]);
  return <section className="eyes-experience" role="dialog" aria-modal="true" aria-label="Constelação dos Olhos">
    {ready && <p className="eyes-phrase" role="status">{eyesPhrase}</p>}
    <button ref={exit} onClick={onExit}>Voltar à galáxia</button>
  </section>;
}
