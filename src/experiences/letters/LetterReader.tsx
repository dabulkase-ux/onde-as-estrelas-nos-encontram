import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../core/useReducedMotion';
import { lostLetters, type LetterId } from './data';
import './letters.css';

export default function LetterReader({id, onExit}: {id: LetterId; onExit: () => void}) {
  const letter = lostLetters.find(letter => letter.id === id)!;
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(1);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const region = useRef<HTMLElement>(null);
  const close = () => { if (closingRef.current) return; closingRef.current = true; setClosing(true); };
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
  return <section ref={region} className={`letter-reader ${closing ? 'letter-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="lost-letter-title" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const buttons = [...(region.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0 || event.shiftKey && index === 0 || !event.shiftKey && index === buttons.length - 1) {
      event.preventDefault(); (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
    }
  }}>
    <div className="letter-scroll"><div className="letter-wrap">
      <header className="letter-toolbar"><span>Cartas perdidas pelo universo</span><button onClick={close} disabled={closing}>Fechar carta</button></header>
      <div className="letter-envelope" aria-hidden="true"><div className="letter-flap"/><div className="letter-seal"/></div>
      <article className="letter-paper" aria-busy={shown < letter.paragraphs.length}>
        <h2 id="lost-letter-title" ref={heading} tabIndex={-1}>{letter.title}</h2>
        {shown < letter.paragraphs.length && <button className="letter-reveal" onClick={() => setRevealed(letter.paragraphs.length)} disabled={closing}>Mostrar carta inteira</button>}
        {letter.paragraphs.slice(0, shown).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </article>
    </div></div>
  </section>;
}
