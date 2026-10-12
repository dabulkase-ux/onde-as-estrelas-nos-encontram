import { useEffect, useRef, useState } from 'react';
import { WishEncounterClock } from './logic';
export function useWishEncounter(active: boolean) {
 const [invited, setInvited] = useState(false);
 const clock = useRef(new WishEncounterClock());
 useEffect(() => {
  if (!active) { if (clock.current.invited) clock.current.dismiss(); setInvited(false); return; }
  let last = performance.now();
  const timer = setInterval(() => {
   const now = performance.now(); const delta = Math.min(1000,now-last); last = now;
   setInvited(clock.current.tick(delta,!document.hidden && document.hasFocus()));
  },250);
  return () => clearInterval(timer);
 },[active]);
 const dismiss = () => { clock.current.dismiss(); setInvited(false); };
 return {invited,dismiss};
}
