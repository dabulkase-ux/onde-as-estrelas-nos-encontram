/** Shuffle copies only; option IDs and their grading data stay together. */
export function shuffleQuestions<T extends { options: readonly unknown[] }>(questions: readonly T[], random: () => number = Math.random): T[] {
  return questions.map(question => {
    const options = [...question.options];
    for (let index = options.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [options[index], options[other]] = [options[other], options[index]];
    }
    return { ...question, options } as T;
  });
}
