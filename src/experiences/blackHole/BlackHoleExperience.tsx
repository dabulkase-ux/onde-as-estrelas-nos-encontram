import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { blackHoleFragments, blackHoleLetter, type BlackHoleFragmentId } from './data';
import type { BlackHoleProjection } from '../../graphics/blackHoleScene';
import './blackHole.css';

interface BlackHoleExperienceProps {
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
  onExit,
}: BlackHoleExperienceProps) {
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
    if (!selectedFragment) return;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    fragmentHeading.current?.focus({ preventScroll: true });
  }, [selectedFragment]);
  useLayoutEffect(() => {
    if (!readingLetter) return;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    letterHeading.current?.focus({ preventScroll: true });
  }, [readingLetter]);
  useEffect(() => () => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
  }, []);
  const closeFragment = () => {
    if (!selected) return;
    onCloseFragment();
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      if (starFormed) readButton.current?.focus({ preventScroll: true });
      else fragmentTargets.current.get(selected)?.focus({ preventScroll: true });
    });
  };
  const closeLetter = () => {
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
          if (readingLetter) closeLetter();
          else if (selected) closeFragment();
          else onExit();
          return;
        }
        if (event.key !== 'Tab') return;
        const activeDialog = readingLetter ? letterDialog.current : selectedFragment ? fragmentDialog.current : null;
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
              hidden={!point.visible || starFormed}
            >
              <span aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {projections.length === 0 && (
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
      <button className="black-hole-return" onClick={onExit}>Voltar à galáxia</button>
      {starFormed && (
        <button ref={readButton} className="black-hole-read" onClick={() => setReadingLetter(true)}>
          Ler o que eu escondo até das estrelas
        </button>
      )}
      {selectedFragment && !readingLetter && (
        <section ref={fragmentDialog} className="black-hole-fragment-card" role="dialog" aria-modal="true" aria-labelledby="black-hole-fragment-title">
          <span className="black-hole-fragment-mark" style={{ '--fragment-color': selectedFragment.color } as CSSProperties} aria-hidden="true" />
          <p>FRAGMENTO {blackHoleFragments.findIndex(fragment => fragment.id === selectedFragment.id) + 1} DE 5</p>
          <h3 ref={fragmentHeading} id="black-hole-fragment-title" tabIndex={-1}>{selectedFragment.title}</h3>
          <p className="black-hole-fragment-text">{selectedFragment.text}</p>
          <button onClick={closeFragment}>Voltar aos fragmentos</button>
        </section>
      )}
      {readingLetter && (
        <section ref={letterDialog} className="black-hole-letter" role="dialog" aria-modal="true" aria-labelledby="black-hole-letter-title">
          <button className="black-hole-letter-close" onClick={closeLetter} aria-label="Fechar carta">Fechar</button>
          <article>
            <p className="black-hole-letter-eyebrow">UMA CARTA GUARDADA ENTRE AS ESTRELAS</p>
            <h3 ref={letterHeading} id="black-hole-letter-title" tabIndex={-1}>{blackHoleLetter.title}</h3>
            {blackHoleLetter.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </article>
        </section>
      )}
    </section>
  );
}
