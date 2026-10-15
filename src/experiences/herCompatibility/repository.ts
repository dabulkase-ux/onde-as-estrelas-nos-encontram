import { blankQuiz, limits, parseQuiz, type QuizDraft } from './model';
import { notifyLocalUniverseChange } from '../herUniverse/localChange';
export const herQuizKey = 'meu-universo.her-compatibility.v1';
export type SaveResult = { ok: true } | { ok: false; error: string };
// Independent local adapter; no remote services or synchronization.
export const quizRepository = {
  load(): { draft: QuizDraft; error?: string } {
    try { const raw = localStorage.getItem(herQuizKey); return { draft: raw ? parseQuiz(raw) : blankQuiz() }; }
    catch { return { draft: blankQuiz(), error: 'Não foi possível ler seu rascunho. Os dados salvos foram preservados.' }; }
  },
  save(draft: QuizDraft): SaveResult {
    try {
      const raw = JSON.stringify(draft);
      if (raw.length > limits.storageCharacters) return { ok: false, error: 'Este rascunho atingiu o limite técnico de armazenamento. Reduza os textos para salvar; a última versão salva permanece intacta.' };
      localStorage.setItem(herQuizKey,raw); notifyLocalUniverseChange(); return { ok: true };
    } catch { return { ok: false, error: 'O navegador não permitiu salvar. Mantenha esta página aberta; a última versão salva permanece intacta.' }; }
  },
};
