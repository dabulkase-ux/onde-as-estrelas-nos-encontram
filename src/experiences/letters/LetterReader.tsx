import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../core/useReducedMotion';
import { lostLetters, type LetterId } from './data';
import './letters.css';

type Content = {title:string;paragraphs:readonly string[]};
export type LetterEditing={title:string;body:string;onTitle:(value:string)=>void;onBody:(value:string)=>void;onSave:()=>boolean;onDelete?:()=>boolean;onDiscard?:()=>void;error?:string};
export default function LetterReader({id, content, editing, onExit}: {id?: LetterId; content?:Content; editing?:LetterEditing; onExit: () => void}) {
  const letter = content ?? lostLetters.find(letter => letter.id === id)!;
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(1);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const region = useRef<HTMLElement>(null);
  const [deleting,setDeleting]=useState(false);
  const finish=()=>{closingRef.current=true;setClosing(true);};
  const close = () => { if (closingRef.current) return;if(editing&&!editing.onSave())return;finish(); };
  useEffect(() => { heading.current?.focus({preventScroll:true}); }, []);
  useEffect(() => {
    if (reduced || closing || revealed >= letter.paragraphs.length) return;
    const timer = setTimeout(() => setRevealed(value => value + 1), 2400);
    return () => clearTimeout(timer);
  }, [reduced, closing, revealed, letter.paragraphs.length]);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onExit, reduced ? 0 : 400);
    return () => clearTimeout(timer);
  }, [closing, onExit, reduced]);
  const shown = reduced ? letter.paragraphs.length : revealed;
  return <section ref={region} className={`letter-reader ${closing ? 'letter-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby={editing?undefined:"lost-letter-title"} aria-label={editing?"Editar cartinha":undefined} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const buttons = [...(region.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)') ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if (index < 0 || event.shiftKey && index === 0 || !event.shiftKey && index === buttons.length - 1) {
      event.preventDefault(); (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
    }
  }}>
    <div className="letter-scroll"><div className="letter-wrap">
      <header className="letter-toolbar"><span>Cartas perdidas pelo universo</span><button onClick={close} disabled={closing}>Fechar carta</button></header>
      <div className="letter-envelope" aria-hidden="true"><div className="letter-flap"/><div className="letter-seal"/></div>
      <article className="letter-paper" aria-busy={shown < letter.paragraphs.length}>
        <h2 id="lost-letter-title" ref={heading} tabIndex={-1}>{editing?<input className="letter-edit-field" disabled={closing} aria-label="Título da cartinha" placeholder="Título da carta" value={editing.title} maxLength={200} onChange={e=>editing.onTitle(e.target.value)}/>:letter.title}</h2>
        {!editing&&shown < letter.paragraphs.length && <button className="letter-reveal" onClick={() => setRevealed(letter.paragraphs.length)} disabled={closing}>Mostrar carta inteira</button>}
        {editing?<p><textarea className="letter-edit-field" disabled={closing} aria-label="Mensagem da cartinha" placeholder="Escreva sua carta aqui..." rows={10} value={editing.body} onChange={e=>editing.onBody(e.target.value)}/></p>:letter.paragraphs.slice(0, shown).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {editing?.error&&<p role="alert">{editing.error}</p>}
        {editing?.onDelete&&<button className="letter-reveal" onClick={()=>setDeleting(true)}>Excluir cartinha</button>}
        {editing?.onDiscard&&<button className="letter-reveal" onClick={editing.onDiscard}>Descartar carta</button>}
        {deleting&&<div role="group" aria-label="Confirmar exclusão da cartinha"><p>Excluir esta cartinha?</p><button className="letter-reveal" disabled={closing} onClick={()=>{if(editing?.onDelete?.())finish();}}>Confirmar exclusão</button><button className="letter-reveal" disabled={closing} onClick={()=>setDeleting(false)}>Cancelar exclusão</button></div>}
      </article>
    </div></div>
  </section>;
}
