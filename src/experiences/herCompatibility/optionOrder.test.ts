import { expect, it } from 'vitest';
import { shuffleQuestions } from './optionOrder';
import { compatibilityScore, newQuestion } from './model';
it('shuffles without mutating saved options or separating IDs from weights', () => {
  const question = newQuestion();
  question.text = 'Preferência';
  question.options.forEach((option, index) => { option.text = `Resposta ${index}`; });
  const original = [...question.options];
  const shuffled = shuffleQuestions([question], () => 0);
  expect(shuffled[0].options).not.toEqual(original);
  expect(question.options).toEqual(original);
  expect(new Set(shuffled[0].options)).toEqual(new Set(original));
  const answers = { [question.id]: original[0].id };
  expect(compatibilityScore(shuffled, answers)).toBe(100);
  expect(compatibilityScore([question], answers)).toBe(100);
});
