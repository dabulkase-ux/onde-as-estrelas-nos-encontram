import { useCallback, useEffect, useRef, useState } from 'react';
import type { Act } from '../core/state';
import { experience as c } from '../config/experience';
import { feedback } from '../effects/feedback';
export function Scanner({ act, onComplete, onProgress }: { act: Act; onComplete: () => void; onProgress: (value: number) => void }) {
  const [progress, setProgress] = useState(0); const [pressed, setPressed] = useState(false);
  const held = useRef(false); const value = useRef(0); const complete = useRef(false); const source = useRef<string | number | null>(null);
  const release = useCallback(() => { held.current = false; source.current = null; setPressed(false); }, []);
  useEffect(() => {
    let frame = 0; let previous = performance.now(); let lastPulse = 0;
    const update = (now: number) => {
      const dt = Math.min(now - previous, 50); previous = now;
      if (act === 'scan' && !complete.current) {
        // A new hold starts from zero: partial presses never accumulate into a successful read.
        value.current = Math.min(1, Math.max(0, value.current + dt / c.timing.hold * (held.current ? 1 : -1.8)));
        setProgress(value.current); onProgress(value.current);
        if (held.current && now - lastPulse > 700) { feedback('tap'); lastPulse = now; }
        if (value.current >= 1) { complete.current = true; release(); feedback('success'); onComplete(); }
      }
      frame = requestAnimationFrame(update);
    };
    const cancel = () => { if (document.hidden) release(); };
    frame = requestAnimationFrame(update); window.addEventListener('blur', release); document.addEventListener('visibilitychange', cancel);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', cancel); };
  }, [act, onComplete, onProgress, release]);
  const start = (id: number | string) => { if (act !== 'scan' || source.current !== null) return; source.current = id; value.current = 0; held.current = true; setPressed(true); feedback('tap'); };
  const recognized = act !== 'scan';
  return <section className={`scanner-scene scene ${pressed ? 'is-scanning' : ''} ${recognized ? 'is-recognized' : ''}`}>
    <div className="scan-heading"><p className="eyebrow">{c.scan.eyebrow}</p><h1>{c.scan.title[0]}<br/><em>{c.scan.title[1]}</em></h1><p className="subtitle">{c.scan.instruction}</p></div>
    <button className="scanner-touch" aria-label={c.scan.accessible} aria-disabled={recognized}
      onPointerDown={e => { if (e.button !== 0 || !e.isPrimary) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); start(e.pointerId); }}
      onPointerUp={e => { if (source.current === e.pointerId) release(); }} onPointerCancel={release} onLostPointerCapture={release} onBlur={release}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(e.key); } }} onKeyUp={e => { if (source.current === e.key) { e.preventDefault(); release(); } }} onContextMenu={e => e.preventDefault()}>
      <svg className="scan-ring" viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="111"/><circle className="ring-progress" cx="120" cy="120" r="111" style={{ strokeDashoffset: 697.44 * (1 - progress) }}/></svg>
      <span className="scan-corner corner-tl"/><span className="scan-corner corner-tr"/><span className="scan-corner corner-bl"/><span className="scan-corner corner-br"/>
    </button>
    <div className="scan-status" aria-live="polite"><p className="scan-status-title">{act === 'love' ? c.scan.love : recognized ? c.scan.recognized : pressed ? c.scan.active : c.scan.idle}</p>{!recognized && <span className="scan-percent" aria-hidden="true">{String(Math.floor(progress * 100)).padStart(2, '0')}<small>%</small></span>}<span className="sr-only" role="progressbar" aria-label="Progresso da leitura" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}/></div>
  </section>;
}
