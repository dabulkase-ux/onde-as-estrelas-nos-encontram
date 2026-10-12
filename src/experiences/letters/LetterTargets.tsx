import type { RefObject } from 'react';
import { lostLetters, type LetterId } from './data';
export interface LetterProjection { id: LetterId; x: number; y: number; visible: boolean; }
export function LetterTargets({targets, read, fallback, onSelect}: {
  targets: RefObject<Map<LetterId, HTMLButtonElement>>; read: readonly LetterId[]; fallback: boolean; onSelect: (id: LetterId) => void;
}) {
  return <div className={`letter-targets ${fallback ? 'letters-fallback' : ''}`} role="group" aria-label="Cartas perdidas pelo universo">
    {lostLetters.map((letter, index) => <button key={letter.id} ref={node => { if (node) targets.current.set(letter.id,node); else targets.current.delete(letter.id); }}
      className={`letter-target ${read.includes(letter.id) ? 'letter-read' : ''}`}
      data-letter-id={letter.id} data-read={read.includes(letter.id)} data-onscreen={fallback ? 'true' : 'false'}
      style={fallback ? {left:`${[26,70,48,18,82,57][index]}%`, top:`${[30,48,23,60,32,63][index]}%`} : undefined}
      aria-label={`${read.includes(letter.id) ? 'Reler' : 'Abrir'} carta: ${letter.title}`} onClick={() => onSelect(letter.id)}>
      <svg viewBox="0 0 60 44" aria-hidden="true"><rect x="4" y="5" width="52" height="34" rx="3"/><path d="M5 7 30 25 55 7 M5 37 22 23 M55 37 38 23"/><circle cx="30" cy="25" r="3"/></svg>
      <span className="letter-target-label">{letter.title}{read.includes(letter.id) ? ' — lida' : ''}</span>
    </button>)}
  </div>;
}
