import { useEffect, useRef } from 'react';

export function GardenExperience({ returning, onExit }: { returning: boolean; onExit: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const exitCallback = useRef(onExit);
  useEffect(() => { exitCallback.current = onExit; }, [onExit]);
  useEffect(() => {
    const exit = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.data?.type === 'garden:exit') exitCallback.current();
    };
    window.addEventListener('message', exit);
    return () => window.removeEventListener('message', exit);
  }, []);
  const exitButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    exitButton.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      className={`garden-experience${returning ? ' garden-experience-returning' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Jardim Eterno"
    >
      <button ref={exitButton} className="garden-experience-exit" onClick={onExit}>
        Voltar ao universo
      </button>
      <iframe
        ref={frame}
        className="garden-experience-frame"
        title="Jardim Eterno"
        src={`${import.meta.env.BASE_URL}jardim-eterno/index.html`}
        sandbox="allow-scripts"
      />
    </section>
  );
}
