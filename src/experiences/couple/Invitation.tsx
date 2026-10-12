import { useCallback, useEffect, useRef, useState } from 'react';
import { nextEscapePoint } from './logic';
export function Invitation({ reduced, onAccept, onAttempt, onChoice }: { reduced: boolean; onAccept: () => void; onAttempt?: () => void; onChoice?: () => void }) {
 const [point, setPoint] = useState({x:.5,y:.5}); const [note, setNote] = useState(false);
 const area = useRef<HTMLDivElement>(null);
 const button = useRef<HTMLButtonElement>(null); const lastMove = useRef(-Infinity);
 const pendingPointerAttempt = useRef(false);
 const selectNo = () => { setNote(true); onChoice?.(); };
 const escape = useCallback(() => {
  if (reduced || button.current?.matches(':focus-visible') || performance.now() - lastMove.current < 160) return;
    const rect = area.current?.getBoundingClientRect();
  if (!rect || rect.width <= 100 || rect.height <= 48) return;
  const spaceY = rect.height - 48;
  const minY = Math.max(0, 8 - rect.top);
  const maxY = Math.min(spaceY, window.innerHeight - rect.top - 56);
  if (maxY < minY) return;
  lastMove.current = performance.now();
  setPoint(p => { const candidate = nextEscapePoint(p); return {x:candidate.x,y:(minY + candidate.y * (maxY-minY))/spaceY}; });
 }, [reduced]);
 useEffect(() => {
 const proximity = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse' || !button.current) return;
  const b = button.current.getBoundingClientRect();
  const dx = Math.max(b.left - event.clientX, 0, event.clientX - b.right);
  const dy = Math.max(b.top - event.clientY, 0, event.clientY - b.bottom);
  if (Math.hypot(dx,dy) < 65) escape();
 };
 document.addEventListener('pointermove', proximity);
 return () => document.removeEventListener('pointermove', proximity);
 }, [escape]);
 return <div className="couple-invitation">
  <button className="couple-primary couple-yes" onClick={onAccept}>Sim</button>
  <div ref={area} className="couple-escape-area" aria-label="Uma pequena brincadeira entre as estrelas">
   <button ref={button} className="couple-no" style={{left:`calc((100% - 100px) * ${point.x})`,top:`calc((100% - 48px) * ${point.y})`}}
    onPointerEnter={event => { if (event.pointerType === 'mouse') escape(); }}
    onPointerDown={event => { if (event.button !== 0) return; pendingPointerAttempt.current = true; onAttempt?.(); if (!reduced && event.pointerType !== 'mouse') { event.preventDefault(); escape(); } }}
    onPointerCancel={() => {pendingPointerAttempt.current=false;}}
    onKeyDown={event => { if(event.key==='Enter' || event.key===' ') pendingPointerAttempt.current=false; }}
    onClick={event => { if(!pendingPointerAttempt.current) onAttempt?.(); pendingPointerAttempt.current=false; if (event.detail === 0 || reduced) selectNo(); else escape(); }}>Não</button>
  </div>
  <button className="couple-secondary" onClick={selectNo}>Escolher Não</button>
  {note && <p className="couple-note" role="status">Sem pressa. Você pode continuar explorando nosso universo.</p>}
 </div>;
}



