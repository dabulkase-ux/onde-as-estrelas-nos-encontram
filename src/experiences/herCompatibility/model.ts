export type Weight = 1 | 2 | 3 | 4;
export type Option = { id: string; text: string; weight: Weight };
export type Question = { id: string; text: string; options: [Option, Option, Option, Option] };
export type QuizDraft = { version: 1; introSeen: boolean; status: 'draft' | 'completed'; questions: Question[] };
export const limits = { question: 600, option: 240, storageCharacters: 1_000_000 };
export const blankQuiz = (): QuizDraft => ({ version: 1, introSeen: false, status: 'draft', questions: [] });
export function newQuestion(): Question {
  return { id: crypto.randomUUID(), text: '', options: [4,3,2,1].map(weight => ({ id: crypto.randomUUID(), text: '', weight: weight as Weight })) as Question['options'] };
}
export function validQuestion(question: Question): boolean {
  return Boolean(question.text.trim()) && question.text.length <= limits.question && question.options.length === 4 &&
    question.options.every(option => Boolean(option.text.trim()) && option.text.length <= limits.option && [1,2,3,4].includes(option.weight));
}
export function canComplete(questions: Question[]): boolean { return questions.length >= 5 && questions.every(validQuestion); }
export function moveQuestion<T extends { id: string }>(questions: T[], id: string, direction: -1 | 1): T[] {
  const from = questions.findIndex(question => question.id === id), to = from + direction;
  if (from < 0 || to < 0 || to >= questions.length) return questions;
  const next = [...questions]; [next[from],next[to]] = [next[to],next[from]]; return next;
}
export function compatibilityScore(questions: Question[], answers: Record<string, string>): number {
  if (!questions.length || !questions.every(validQuestion)) throw new Error('O quiz precisa de perguntas válidas.');
  const sum = questions.reduce((sum, question) => {
    const option = question.options.find(option => option.id === answers[question.id]);
    if (!option) throw new Error('Responda a todas as perguntas.');
    return sum + option.weight;
  }, 0);
  return Math.round(sum / (questions.length * 4) * 100);
}
export function parseQuiz(raw: string): QuizDraft {
  if (raw.length > limits.storageCharacters) throw new Error('O rascunho ultrapassa o tamanho técnico suportado.');
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.questions) || !['draft','completed'].includes(value.status)) throw new Error('O rascunho salvo não pôde ser lido.');
  const ids = new Set<string>();
  const identify = (id: unknown) => { if (typeof id !== 'string' || !id || id.length > 100 || ids.has(id)) throw new Error('Identificador inválido no rascunho.'); ids.add(id); return id; };
  const text = (text: unknown, maximum: number) => { if (typeof text !== 'string' || text.length > maximum) throw new Error('Texto inválido no rascunho.'); return text; };
  const questions: Question[] = value.questions.map((question: Question) => {
    const id = identify(question?.id);
    if (!Array.isArray(question.options) || question.options.length !== 4) throw new Error('Cada pergunta precisa de quatro alternativas.');
    const options = question.options.map(option => {
      if (![1,2,3,4].includes(option?.weight)) throw new Error('Peso inválido no rascunho.');
      return { id: identify(option.id), text: text(option.text,limits.option), weight: option.weight };
    }) as Question['options'];
    return { id, text: text(question.text,limits.question), options };
  });
  return { version: 1, introSeen: value.introSeen === true, status: value.status === 'completed' && canComplete(questions) ? 'completed' : 'draft', questions };
}
