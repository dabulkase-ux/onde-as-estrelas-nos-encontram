import { useEffect, useRef, useState } from 'react';

export const nexusLines = [
  'Olha só… parece que recebemos permissão para explorar um universo novo.',
  'Prazer, eu sou Nexus. O chefe me pediu para acompanhar você nessa aventura.',
  'Ele passou bastante tempo construindo o universo dele. Agora quero descobrir como seria o seu.',
  'Preparando salto interuniversal… espero que você goste de viajar entre estrelas.',
];

export function NexusSpeech({ text, reduced, onContinue }: { text: string; reduced: boolean; onContinue: () => void }) {
  const [characters, setCharacters] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { button.current?.focus({ preventScroll: true }); }, []);
  const complete = reduced || characters >= text.length;
  useEffect(() => {
    if (complete) return;
    const timer = setInterval(() => setCharacters(value => Math.min(text.length, value + 1)), 40);
    return () => clearInterval(timer);
  }, [complete, text]);
  return <div className="nexus-speech" data-speaking={!complete}>
    <p className="nexus-text" aria-hidden="true">{complete ? text : text.slice(0, characters)}<span className="nexus-text-reserve">{complete ? '' : text.slice(characters)}</span></p>
    <p className="sr-only" role="status">{text}</p>
    <button ref={button} className="nexus-continue" onKeyDown={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }} onClick={() => { if (!complete) setCharacters(text.length); else onContinue(); }}>{complete ? 'Continuar' : 'Mostrar frase completa'}</button>
  </div>;
}
