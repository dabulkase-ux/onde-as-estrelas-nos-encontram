import { useEffect, useRef, useState } from 'react';
import { invoke, savingAvailable, type Submission } from '../services/supabase';
import './saving.css';
export function SaveSubmission({payload}: {payload: Submission}) {
 const id = useRef<string | null>(null); const busy = useRef(false);
 const [state, setState] = useState<'ready' | 'sending' | 'done' | 'declined'>('ready');
 const [error, setError] = useState('');
 const panel = useRef<HTMLElement>(null); const result = useRef<HTMLParagraphElement>(null);
 useEffect(() => { if(state === 'done') result.current?.focus({preventScroll:true}); }, [state]);
 if (!savingAvailable || state === 'declined') return null;
 const send = async () => {
  if (busy.current || state === 'done') return;
  busy.current = true; setState('sending'); setError('');
  try { id.current ??= crypto.randomUUID(); await invoke('submit', {...payload, consent: true, submissionId: id.current}); setState('done'); }
  catch { setState('ready'); setError('Não foi possível enviar. Você pode tentar novamente ou continuar sem salvar.'); }
  finally { busy.current = false; }
 };
 return <aside ref={panel} className="save-submission" aria-label={payload.kind === 'proposal' ? 'Salvamento opcional do pedido' : 'Salvamento opcional do quiz'}>
  {state === 'done' ? <p ref={result} tabIndex={-1} role="status">Enviado ao proprietário.</p> : <>
   <p>Suas respostas podem ser salvas para que eu possa vê-las depois. Você pode continuar sem salvá-las.</p>
   <button disabled={state === 'sending'} onClick={send}>{state === 'sending' ? 'Enviando...' : 'Autorizar e enviar'}</button>
   <button disabled={state === 'sending'} onClick={() => {panel.current?.closest('section')?.querySelector<HTMLHeadingElement>('h2')?.focus({preventScroll:true});setState('declined');}}>Continuar sem salvar</button>
   {error && <p role="status">{error}</p>}
  </>}
 </aside>;
}
