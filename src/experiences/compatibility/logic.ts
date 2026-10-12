import { questions } from './data';
export const storageKey = 'meu-universo.compatibility.v1';
export type Progress = { answers: (string | null)[]; completed: boolean };
export function emptyProgress(): Progress { return { answers: questions.map(() => null), completed: false }; }
export function score(answers: Progress['answers']): number {
 if (answers.length !== questions.length) throw new Error('Responda às dez perguntas.');
 const sum = answers.reduce<number>((sum, id, i) => {
  const option = questions[i].options.find(option => option.id === id);
  if (!option) throw new Error('Resposta inválida.');
  return sum + option.weight;
 }, 0);
 // Equivalent to (sum / 40) * 100, without floating-point display artifacts.
 return sum * 100 / 40;
}
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
 const result = [...items];
 for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
 return result;
}
export function readProgress(): Progress {
 try {
  const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  if (!value || !Array.isArray(value.answers) || value.answers.length !== questions.length) return emptyProgress();
  const answers = value.answers.map((id: unknown, i: number) => questions[i].options.some(o => o.id === id) ? id as string : null);
  return { answers, completed: value.completed === true && answers.every((id: string | null) => id !== null) };
 } catch { return emptyProgress(); }
}
export function saveProgress(progress: Progress): boolean {
 try { localStorage.setItem(storageKey, JSON.stringify(progress)); return true; } catch { return false; }
}

