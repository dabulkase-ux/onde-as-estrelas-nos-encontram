import { useEffect, useState } from 'react';
import { experience as c } from '../config/experience';
export function Narrative({ onComplete }: { onComplete: () => void }) {
  const [line, setLine] = useState(0);
  useEffect(() => { const timer = setTimeout(() => { if (line < c.narrative.length - 1) setLine(line + 1); else onComplete(); }, c.timing.narrativeLine); return () => clearTimeout(timer); }, [line, onComplete]);
  return <section className="narrative scene" aria-live="polite"><span className="tiny-star" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L10 6L15 8L10 10L8 15L6 10L1 8L6 6Z"/></svg></span><h2 key={line}>{c.narrative[line]}</h2><span className="narrative-rule"/></section>;
}
