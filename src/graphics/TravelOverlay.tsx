import {useEffect,useRef,type RefObject} from 'react';
/** Original travel overlay, extracted without changing its markup or styles. */
export function TravelOverlay({destination,phase,text,onSkip,buttonRef,autoFocus=false}:{destination:string;phase:string;text:string;onSkip:()=>void;buttonRef?:RefObject<HTMLButtonElement|null>;autoFocus?:boolean}){
 const local=useRef<HTMLButtonElement>(null),access=buttonRef??local;
 useEffect(()=>{if(autoFocus)access.current?.focus({preventScroll:true});},[autoFocus,access]);
 return <div className={`travel-overlay destination-${destination}${phase==='PORTAL_ENTRY'?' portal-crossing':''}${phase==='BLACK_HOLE_ENTRY'?' black-hole-crossing':''}`} role="status"><p>{text}</p><button ref={access} onClick={onSkip}>Pular animação</button></div>;
}
