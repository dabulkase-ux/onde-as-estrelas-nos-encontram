import {useEffect,useRef,useState} from 'react';
import type {HerLetter} from '../letters/repository';
import type {HerBlackHole} from './repository';
import './organizer.css';

type Collection<T>={items:readonly T[];open:(id:string)=>void;locate:(id:string)=>void;remove:(id:string)=>boolean;error:string};
type Item={id:string;title:string;preview:string};
export function ElementOrganizer({letters,holes}:{letters:Collection<HerLetter>;holes:Collection<HerBlackHole>}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [opened,setOpened]=useState(false),[pending,setPending]=useState<{type:'letters'|'holes';id:string;title:string}|null>(null),[failure,setFailure]=useState('');
 useEffect(()=>{if(opened)dialog.current?.showModal();else dialog.current?.close();},[opened]);
 const close=()=>{setOpened(false);setPending(null);setFailure('');trigger.current?.focus();};
 const groups:{key:'letters'|'holes';label:string;items:Item[]}[]=[
  {key:'letters',label:'Cartinhas',items:letters.items.map((l,i)=>({id:l.id,title:l.title.trim()||`Carta ${i+1}`,preview:l.paragraphs.join(' ').slice(0,120)}))},
  {key:'holes',label:'Buracos negros',items:holes.items.map((h,i)=>({id:h.id,title:`Buraco negro ${i+1}`,preview:h.crystals.map(c=>c.title.trim()||c.text.trim()).filter(Boolean).join(' · ').slice(0,120)}))}
 ];
 const collection=(key:'letters'|'holes')=>key==='letters'?letters:holes;
 return <>
  <button ref={trigger} onClick={()=>setOpened(true)} aria-haspopup="dialog" aria-expanded={opened}>Meus elementos</button>
  <dialog ref={dialog} className="her-organizer" aria-labelledby="her-organizer-title" onKeyDown={event=>{
   if(event.key!=='Tab')return;
   const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,summary')).filter(node=>node.getClientRects().length>0);
   const first=controls[0],last=controls[controls.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }} onCancel={event=>{event.preventDefault();close();}} onClose={()=>setOpened(false)}>
   <header><h2 id="her-organizer-title">Meus elementos</h2><button onClick={close} autoFocus>Fechar</button></header>
   {(failure||letters.error||holes.error)&&<p role="alert">{failure||letters.error||holes.error}</p>}
   {pending?<section aria-label="Confirmar exclusão"><p>Excluir {pending.title}?</p><p>Somente este elemento e seu conteúdo serão removidos.</p><div className="her-organizer-actions"><button onClick={()=>{if(collection(pending.type).remove(pending.id)){setPending(null);setFailure('');}else setFailure('Não foi possível excluir. Seu rascunho foi preservado.');}}>Confirmar exclusão</button><button onClick={()=>setPending(null)}>Cancelar exclusão</button></div></section>:<>
    {!groups.some(g=>g.items.length)&&<p>Você ainda não adicionou elementos à sua galáxia.</p>}
    {groups.map(group=><details key={group.key} open><summary>{group.label} ({group.items.length})</summary><ul>{group.items.map(item=><li key={item.id}><h3>{item.title}</h3><small>{group.key==='letters'?'Carta':'Buraco negro'}</small>{item.preview&&<p>{item.preview}</p>}<div className="her-organizer-actions"><button onClick={()=>{close();collection(group.key).locate(item.id);}}>Localizar</button><button onClick={()=>{close();collection(group.key).open(item.id);}}>Editar</button><button onClick={()=>setPending({type:group.key,id:item.id,title:item.title})}>Excluir</button></div></li>)}</ul></details>)}
   </>}
  </dialog>
 </>;
}
