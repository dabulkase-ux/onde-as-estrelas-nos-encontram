import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { experience as c } from '../config/experience';
import { attemptMessage, checkPin } from '../core/pin';
import { feedback } from '../effects/feedback';

export function Lock({ opening, onUnlock }: { opening: boolean; onUnlock: () => void }) {
  const [pin, setPin] = useState(''); const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState(''); const [rejecting, setRejecting] = useState(false);
  const busy = useRef(false); const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const input = useCallback((key: string) => {
    if (opening || busy.current) return;
    if (key === 'Backspace') { setPin(p => p.slice(0, -1)); return; }
    if (key === 'Escape') { setPin(''); return; }
    if (!/^\d$/.test(key) || pin.length === 4) return;
    feedback('tap'); const value = pin + key; setPin(value); setMessage('');
    if (value.length !== 4) return;
    const result = checkPin(value, c.birthdays.firstDay, c.birthdays.secondDay);
    busy.current = true;
    if (result === 'correct') { feedback('success'); onUnlock(); return; }
    feedback('error'); setRejecting(true); setAttempts(attempts + 1);
    setMessage(result === 'reversed' ? c.lock.reversed : attemptMessage(attempts + 1, c.lock.errors));
    timer.current = setTimeout(() => { setPin(''); setRejecting(false); busy.current = false; }, c.timing.rejection);
  }, [opening, pin, attempts, onUnlock]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement) return; if (/^\d$/.test(event.key) || ['Backspace', 'Escape'].includes(event.key)) { event.preventDefault(); input(event.key); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [input]);
  return <section className={`lock-scene scene ${opening ? 'is-opening' : ''}`} aria-label="O cadeado">
    <div className="lock-heading"><p className="eyebrow">{c.lock.eyebrow}</p><h1>{c.lock.title[0]}<br/><em>{c.lock.title[1]}</em></h1><p className="subtitle">{c.lock.subtitle}</p></div>
    <div className={`lock-art ${rejecting ? 'rejected' : ''}`} aria-hidden="true">
      <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="lock-aura"/>
      <svg className="padlock" viewBox="0 0 120 150"><defs><linearGradient id="metal" x1="0" x2="1" y2="1"><stop stopColor="#ead9b5"/><stop offset=".38" stopColor="#a58b68"/><stop offset=".65" stopColor="#f4e7cb"/><stop offset="1" stopColor="#7d694d"/></linearGradient><linearGradient id="body" x2=".9" y2="1"><stop stopColor="#272722"/><stop offset="1" stopColor="#0e1114"/></linearGradient></defs><path className="shackle" d="M34 68V42a26 26 0 0 1 52 0v26" fill="none" stroke="url(#metal)" strokeWidth="7" strokeLinecap="round"/><rect x="21" y="63" width="78" height="68" rx="13" fill="url(#body)" stroke="url(#metal)" strokeWidth="1.1"/><rect x="26" y="68" width="68" height="58" rx="9" fill="none" stroke="#dac49b" strokeOpacity=".13"/><path d="M60 87a5 5 0 0 0-3 9l-2 12h10l-2-12a5 5 0 0 0-3-9" fill="url(#metal)"/></svg>
      <span className="orbit-star star-one">✦</span><span className="orbit-star star-two">✧</span>
      {Array.from({ length: 12 }, (_, i) => <i key={i} className="unlock-spark" style={{ '--dx': `${Math.cos(i * Math.PI / 6) * (70 + i * 5)}px`, '--dy': `${Math.sin(i * Math.PI / 6) * (70 + i * 5)}px`, animationDelay: `${i * .035}s` } as CSSProperties}/>)}
    </div>
    <div className="pin-area"><div className="pin-dots" role="img" aria-label={`${c.labels.pin}: ${pin.length} de 4 preenchidos`}>{[0,1,2,3].map(i => <span key={i} className={i < pin.length ? 'filled' : ''}/>)}</div>
      <p className={`pin-message ${message ? 'has-message' : ''}`} aria-live="polite">{opening ? c.lock.opening : message || c.lock.prompt}</p></div>
    <div className="keypad" aria-label="Teclado numérico">{[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => input(String(n))} disabled={opening || rejecting}>{n}</button>)}<button className="key-utility" aria-label={c.labels.hint} onClick={() => setMessage(c.labels.hintText)} disabled={opening}>?</button><button onClick={() => input('0')} disabled={opening || rejecting}>0</button><button className="key-utility" onClick={() => input('Backspace')} aria-label={c.labels.delete} disabled={opening || rejecting}><svg width="23" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true"><path d="M9 2h12v14H9L2 9zM12 6l6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg></button></div>
  </section>;
}
