import { QuizVisuals } from '../compatibility/QuizVisuals';
import '../compatibility/quiz.css';
import '../couple/couple.css';
import './presentation.css';

/** Shared presentation only: answers, validation and scoring stay in each quiz. */
export function ParticipantVisuals({ index, total, result, kind }: {
  index: number; total: number; result: number | null; kind: 'compatibility' | 'couple';
}) {
  return <>
    <QuizVisuals stage={result === null ? 'questions' : 'percentage'}/>
    {result === null ? <progress value={index + 1} max={total} aria-label="Progresso do quiz"/>
      : <p className="her-result-percentage" aria-hidden="true">{result}%<span>{kind === 'couple' ? 'Seu universo, em cada resposta' : 'Entre dois universos'}</span></p>}
  </>;
}
