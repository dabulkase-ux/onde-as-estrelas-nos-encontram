import { useEffect, useRef, useState } from 'react';
import { savingAvailable } from '../../services/supabase';
import { createWishDelivery, WISH_LIMIT } from './logic';
import './wishes.css';
export function WishInvitation({visible,onAccept,onDismiss}:{visible:boolean;onAccept:()=>void;onDismiss:()=>void}) {
 return <aside className={`wish-invitation ${visible ? 'is-visible' : ''}`} aria-hidden={!visible} inert={!visible} aria-label="Uma estrela cadente"><p>Olha só... uma estrela cadente.</p><p>Dizem que dá pra fazer um pedido quando uma passa. Quer tentar?</p><div><button onClick={onAccept}>Quero tentar</button><button onClick={onDismiss}>Agora não</button></div></aside>;
}
export default function WishExperience({onExit,onDelivered}:{onExit:()=>void;onDelivered:()=>void}) {
 const [text,setText]=useState(''); const [state,setState]=useState<'writing'|'sending'|'sent'>('writing'); const [error,setError]=useState('');
 const [delivery]=useState(createWishDelivery); const busy=useRef(false); const live=useRef(true);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{ live.current=true;heading.current?.focus({preventScroll:true}); return()=>{live.current=false;}; },[]);
 useEffect(()=>{ if(state==='sent')heading.current?.focus({preventScroll:true}); },[state]);
 const send=async(event:React.FormEvent)=>{
  event.preventDefault();if(busy.current||state==='sent')return;busy.current=true;setState('sending');setError('');
  try {await delivery.deliver(text);if(live.current){setState('sent');onDelivered();}}
  catch {if(live.current){setState('writing');setError('Não foi possível entregar seu desejo. Ele continua aqui; você pode tentar novamente.');}}
  finally {busy.current=false;}
 };
 return <section className="wish-experience" aria-label="Estrela cadente dos desejos" onKeyDown={e=>{if(e.key==='Escape'&&!busy.current)onExit();}}>
  <div className="wish-paper">
   {state==='sent'?<><h2 ref={heading} tabIndex={-1}>Talvez o universo já esteja trabalhando nisso...</h2><button onClick={onExit}>Voltar ao universo</button></>:<>
    <p className="wish-prelude">Dizem que estrelas cadentes realizam desejos...</p>
    <h2 ref={heading} tabIndex={-1}>Se pudesse pedir uma coisa ao universo, o que seria?</h2>
    <form onSubmit={send}><label className="sr-only" htmlFor="universe-wish">Seu desejo</label><textarea id="universe-wish" placeholder="Escreva seu desejo aqui..." maxLength={WISH_LIMIT} value={text} onChange={e=>setText(e.target.value)} disabled={state==='sending'} required aria-describedby="wish-disclosure wish-length"/>
     <p id="wish-length" className="wish-note">{text.length}/{WISH_LIMIT}</p>
     <p id="wish-disclosure" className="wish-note">Ao entregar seu desejo, você o compartilha com o criador deste universo. Você pode voltar sem enviar.</p>
     {!savingAvailable&&<p className="wish-note" role="status">O envio de desejos ainda não está disponível.</p>}
     {error&&<p role="alert" className="wish-note">{error}</p>}
     <button disabled={!text.trim()||state==='sending'||!savingAvailable} type="submit">{state==='sending'?'Entregando seu desejo...':'Entregar meu desejo ao universo'}</button>
     <button type="button" disabled={state==='sending'} onClick={onExit}>Voltar</button>
    </form>
   </>}
  </div>
 </section>;
}
