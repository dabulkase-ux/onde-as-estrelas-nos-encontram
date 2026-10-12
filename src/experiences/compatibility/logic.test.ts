import { validateSubmission } from '../../../supabase/functions/_shared/security';
import { describe, expect, it } from 'vitest';
import { questions } from './data';
import { emptyProgress, readProgress, saveProgress, score, shuffle, storageKey } from './logic';
describe('compatibility', () => {
 it('preserves Canada and the four travel choices; New York remains weight 3 on frontend and backend', () => {
  expect(questions[1].options.map(o=>[o.text,o.weight])).toEqual([['Canadá.',4],['New York',3],['Itália.',2],['Japão.',1]]);
  const answers=questions.map(q=>q.options[0].id);answers[1]='1-1';
  expect(score(answers)).toBe(97.5);
  expect(validateSubmission({kind:'compatibility',answers,consent:true,submissionId:crypto.randomUUID()}).row.result).toBe(97.5);
 });
 it('calculates actual minimum, maximum and intermediate affinity', () => {
  expect(score(questions.map(q => q.options[3].id))).toBe(25);
  expect(score(questions.map(q => q.options[0].id))).toBe(100);
  expect(score(questions.map((q,i) => q.options[i % 2 ? 1 : 2].id))).toBe(62.5);
 });
 it('keeps every possible score in exact 2.5 percent increments', () => {
  for (let total=10;total<=40;total++) { let remaining=total-10; const answers=questions.map(q => { const extra=Math.min(remaining,3); remaining-=extra; return q.options[3-extra].id; }); expect(score(answers)).toBe(total*2.5); }
 });
 it('shuffles without losing identity, weights or mutating data', () => {
  for (const q of questions) { const before = [...q.options]; const mixed = shuffle(q.options, () => 0); expect(mixed).not.toEqual(before); expect(new Set(mixed)).toEqual(new Set(before)); expect(q.options).toEqual(before); }
 });
 it('rejects partial and foreign answers', () => { expect(() => score([])).toThrow(); expect(() => score(questions.map(() => 'bad'))).toThrow(); });
 it('validates saved answers and degrades gracefully when storage is unavailable', () => {
  const values = new Map<string,string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key,value) } });
  const complete = { answers: questions.map(q => q.options[0].id), completed: true }; expect(saveProgress(complete)).toBe(true); expect(readProgress()).toEqual(complete);
  values.set(storageKey, JSON.stringify({answers: questions.map(() => 'foreign'),completed:true})); expect(readProgress()).toEqual(emptyProgress());
  values.set(storageKey, '{'); expect(readProgress()).toEqual(emptyProgress());
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  expect(readProgress()).toEqual(emptyProgress()); expect(saveProgress(complete)).toBe(false);
 });
});

