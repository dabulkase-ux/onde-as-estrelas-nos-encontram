import { ApiError, invoke, savingAvailable, type Submission } from './supabase';

type QuizSubmission = Extract<Submission, { answers: string[] }>;

// A dedicated deployment for a participant who already agreed; never inferred
// from the PIN, stored answers, or simply visiting the site.
export function sharingAuthorized(mode: string | undefined, search: string): boolean {
 return mode === 'preauthorized' && !new URLSearchParams(search).has('sem-coleta');
}

export function createQuizCompletionSender(
 authorized = () => savingAvailable && sharingAuthorized(import.meta.env.VITE_QUIZ_SHARING_MODE, window.location.search),
 send = (payload: unknown) => invoke('submit', payload),
 report = (details: { quiz: string; status?: number }) => console.error('[quiz-sharing] Falha ao salvar conclusão.', details),
) {
 let completed = false;
 return {
  reset() { completed = false; },
  complete(payload: QuizSubmission) {
   if (completed) return;
   completed = true;
   if (!authorized()) return;
   // The server's unique submission_id protects against duplicate records.
   // No automatic retry or retrospective upload of previously saved results.
   void (async () => {
    try {
     await send({ ...payload, answers: [...payload.answers], consent: true, submissionId: crypto.randomUUID() });
    } catch (error) {
     report({ quiz: payload.kind, status: error instanceof ApiError ? error.status : undefined });
    }
   })();
  },
 };
}
