import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { blackHoleFragments as originalFragments, blackHoleLetter as originalLetter, type BlackHoleFragmentId } from './data';
import type { BlackHoleProjection } from '../../graphics/blackHoleScene';
import './blackHole.css';

export type BlackHoleContent={fragments:{id:BlackHoleFragmentId;title:string;text:string;color:string}[];letter:{title:string;paragraphs:readonly string[]}|null};
export type BlackHoleEditing={fragmentTitle:(id:BlackHoleFragmentId)=>string;onFragment:(id:BlackHoleFragmentId,field:'title'|'text',value:string)=>void;onLetter:(field:'title'|'body',value:string)=>void;save:()=>boolean;deleteLetter:()=>boolean;deleteElement:()=>boolean;error:string};
interface BlackHoleExperienceProps {
  content?:BlackHoleContent;
  editing?:BlackHoleEditing;
  discovered: readonly BlackHoleFragmentId[];
  starFormed: boolean;
  selected: BlackHoleFragmentId | null;
  projections: readonly BlackHoleProjection[];
  onSelect: (id: BlackHoleFragmentId) => void;
  onCloseFragment: () => void;
  onExit: () => void;
}

export function BlackHoleExperience({
  discovered,
  starFormed,
  selected,
  projections,
  onSelect,
  onCloseFragment,
  onExit, content, editing,
}: BlackHoleExperienceProps) {
  const blackHoleFragments=content?.fragments??originalFragments,blackHoleLetter=content?content.letter:originalLetter;
  const [editingCrystals,setEditingCrystals]=useState(false),[deleting,setDeleting]=useState<'element'|'letter'|null>(null);
  const deleteDialog=useRef<HTMLElement>(null);
  const [readingLetter, setReadingLetter] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const fragmentHeading = useRef<HTMLHeadingElement>(null);
  const letterHeading = useRef<HTMLHeadingElement>(null);
  const fragmentDialog = useRef<HTMLElement>(null);
  const letterDialog = useRef<HTMLElement>(null);
  const readButton = useRef<HTMLButtonElement>(null);
  const fragmentTargets = useRef(new Map<BlackHoleFragmentId, HTMLButtonElement>());
  const focusFrame = useRef<number | null>(null);
  const selectedFragment = blackHoleFragments.find(fragment => fragment.id === selected);
  useLayoutEffect(() => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    heading.current?.focus({ preventScroll: true });
  }, []);
  useLayoutEffect(() => {
    if (!selected) return;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    fragmentHeading.current?.focus({ preventScroll: true });
  }, [selected]);
  useLayoutEffect(() => {
    if (!readingLetter) return;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    letterHeading.current?.focus({ preventScroll: true });
  }, [readingLetter]);
  useEffect(() => () => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
  }, []);
  useLayoutEffect(()=>{if(deleting)deleteDialog.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});},[deleting]);
  const closeFragment = () => {
    if (!selected) return;
    if(editing&&!editing.save())return;
    onCloseFragment();
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      if (starFormed) readButton.current?.focus({ preventScroll: true });
      else fragmentTargets.current.get(selected)?.focus({ preventScroll: true });
    });
  };
  const closeLetter = () => {
    if(editing&&!editing.save())return;
    setReadingLetter(false);
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      readButton.current?.focus({ preventScroll: true });
    });
  };

  return (
    <section
      className="black-hole-experience"
      role="region"
      aria-label="Buraco Negro dos Segredos"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          if(deleting)setDeleting(null);
          else if (readingLetter) closeLetter();
          else if (selected) closeFragment();
          else onExit();
          return;
        }
        if (event.key !== 'Tab') return;
        const activeDialog = deleting ? deleteDialog.current : readingLetter ? letterDialog.current : selectedFragment ? fragmentDialog.current : null;
        if (!activeDialog) return;
        const focusable = [...activeDialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;
        const outside = !activeDialog.contains(activeElement);
        const activeIsFocusable = focusable.some(element => element === activeElement);
        if (event.shiftKey && (document.activeElement === first || outside || !activeIsFocusable)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || outside || !activeIsFocusable)) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="black-hole-atmosphere" aria-hidden="true" />
      <header className="black-hole-heading">
        <p>UM LUGAR DENTRO DE MIM</p>
        <h2 ref={heading} tabIndex={-1}>Buraco Negro dos Segredos</h2>
        <span>{discovered.length} de 5 fragmentos descobertos</span>
      </header>
      <div className="black-hole-targets" aria-label="Fragmentos cristalinos">
        {projections.map(point => {
          const fragment = blackHoleFragments.find(item => item.id === point.id)!;
          const found = discovered.includes(point.id);
          return (
            <button
              key={point.id}
              ref={node => {
                if (node) fragmentTargets.current.set(point.id, node);
                else fragmentTargets.current.delete(point.id);
              }}
              className={`black-hole-crystal-target${found ? ' is-discovered' : ''}`}
              style={{ left: point.x, top: point.y, '--fragment-color': fragment.color } as CSSProperties}
              aria-label={`${found ? 'Rever' : 'Descobrir'} fragmento: ${fragment.title}`}
              aria-pressed={selected === point.id}
              onClick={() => onSelect(point.id)}
              tabIndex={point.visible ? 0 : -1}
              hidden={!point.visible || starFormed || editingCrystals}
            >
              <span aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {(projections.length === 0 || editingCrystals) && (
        <div className="black-hole-fallback-fragments" aria-label="Escolher um fragmento">
          {blackHoleFragments.map(fragment => (
            <button key={fragment.id} ref={node => {
              if (node) fragmentTargets.current.set(fragment.id, node);
              else fragmentTargets.current.delete(fragment.id);
            }} onClick={() => onSelect(fragment.id)} aria-label={`Descobrir fragmento: ${fragment.title}`}>
              <span style={{ '--fragment-color': fragment.color } as CSSProperties} aria-hidden="true" />
              {fragment.title}
            </button>
          ))}
        </div>
      )}
      <p className="black-hole-hint" aria-live="polite">
        {starFormed
          ? 'Os fragmentos encontraram seu lugar.'
          : 'Toque em um cristal para descobrir o que ele guarda.'}
      </p>
      <button className="black-hole-return" onClick={()=>{if(!editing||editing.save())onExit();}}>Voltar à galáxia</button>
      {starFormed && (blackHoleLetter||editing) && (
        <button ref={readButton} className="black-hole-read" onClick={() => setReadingLetter(true)}>
          {content?(blackHoleLetter?'Ler carta da estrela':'Escrever carta da estrela'):'Ler o que eu escondo até das estrelas'}
        </button>
      )}
      {editing&&!selectedFragment&&!readingLetter&&<div className="her-hole-controls"><button onClick={()=>setEditingCrystals(v=>!v)}>{editingCrystals?'Voltar à estrela':'Editar cristais'}</button><button onClick={()=>setDeleting('element')}>Excluir buraco negro</button></div>}
      {deleting&&<section ref={deleteDialog} role="alertdialog" aria-label="Confirmar exclusão" className="black-hole-fragment-card"><h3>Excluir {deleting==='element'?'este buraco negro e seu conteúdo':'a carta da estrela'}?</h3><button onClick={()=>{const ok=deleting==='element'?editing?.deleteElement():editing?.deleteLetter();if(ok){setDeleting(null);if(deleting==='letter')setReadingLetter(false);}}}>Confirmar exclusão</button><button onClick={()=>setDeleting(null)}>Cancelar exclusão</button></section>}
      {editing?.error&&<p className="her-element-error" role="alert">{editing.error}</p>}
      {selectedFragment && !readingLetter && (
        <section ref={fragmentDialog} className="black-hole-fragment-card" role="dialog" aria-modal="true" aria-labelledby="black-hole-fragment-title">
          <span className="black-hole-fragment-mark" style={{ '--fragment-color': selectedFragment.color } as CSSProperties} aria-hidden="true" />
          <p>FRAGMENTO {blackHoleFragments.findIndex(fragment => fragment.id === selectedFragment.id) + 1} DE 5</p>
          <h3 ref={fragmentHeading} id="black-hole-fragment-title" tabIndex={-1}>{editing?<input className="her-element-edit" aria-label="Título do cristal" placeholder="Título do cristal" maxLength={200} value={editing.fragmentTitle(selectedFragment.id)} onChange={e=>editing.onFragment(selectedFragment.id,'title',e.target.value)}/>:selectedFragment.title}</h3>
          <p className="black-hole-fragment-text">{editing?<textarea className="her-element-edit" rows={7} aria-label="Conteúdo do cristal" placeholder="Escreva sua mensagem..." value={selectedFragment.text} onChange={e=>editing.onFragment(selectedFragment.id,'text',e.target.value)}/>:selectedFragment.text}</p>
          <button onClick={closeFragment}>{editing?'Salvar e fechar':'Voltar aos fragmentos'}</button>
        </section>
      )}
      {readingLetter && (
        <section ref={letterDialog} className="black-hole-letter" role="dialog" aria-modal="true" aria-labelledby="black-hole-letter-title">
          <button className="black-hole-letter-close" onClick={closeLetter} aria-label="Fechar carta">{editing?'Salvar e fechar':'Fechar'}</button>
          <article>
            <p className="black-hole-letter-eyebrow">UMA CARTA GUARDADA ENTRE AS ESTRELAS</p>
            <h3 ref={letterHeading} id="black-hole-letter-title" tabIndex={-1}>{editing?<input className="her-element-edit" aria-label="Título da carta da estrela" placeholder="Título da carta" maxLength={200} value={blackHoleLetter?.title??''} onChange={e=>editing.onLetter('title',e.target.value)}/>:blackHoleLetter?.title}</h3>
            {editing?<p><textarea className="her-element-edit" rows={12} aria-label="Conteúdo da carta da estrela" placeholder="Escreva sua carta aqui..." value={blackHoleLetter?.paragraphs.join('\n')??''} onChange={e=>editing.onLetter('body',e.target.value)}/></p>:blackHoleLetter?.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {editing&&blackHoleLetter&&<button onClick={()=>setDeleting('letter')}>Excluir carta da estrela</button>}
          </article>
        </section>
      )}
    </section>
  );
}
