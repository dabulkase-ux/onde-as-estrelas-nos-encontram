import { afterEach, describe, expect, it, vi } from 'vitest';
import { blankQuiz, canComplete, compatibilityScore, limits, moveQuestion, newQuestion, parseQuiz, validQuestion, type Question } from './model';
import { herQuizKey, quizRepository } from './repository';
function ready(index=0):Question { const question=newQuestion();question.text=`Pergunta ${index}`;question.options.forEach((option,index)=>{option.text=`Resposta ${index}`;});return question; }
afterEach(()=>vi.unstubAllGlobals());
describe('visitor compatibility quiz',()=>{
  it('starts from zero and creates stable unique IDs with fixed descending weights for new questions',()=>{
    expect(blankQuiz().questions).toEqual([]);const question=newQuestion();expect(question.options).toHaveLength(4);
    expect(new Set([question.id,...question.options.map(option=>option.id)]).size).toBe(5);
    const id=question.options[0].id;question.options[0].text='Novo texto';question.options[0].weight=4;
    expect(question.options[0].id).toBe(id);expect(question.options.map(option=>option.weight)).toEqual([4,3,2,1]);
  });
  it('requires five fully valid questions and permits more than twenty',()=>{
    const questions=Array.from({length:35},(_,index)=>ready(index));expect(canComplete(questions)).toBe(true);
    expect(canComplete(questions.slice(0,4))).toBe(false);questions[0].options[3].text=' ';expect(canComplete(questions)).toBe(false);
    expect(validQuestion(newQuestion())).toBe(false);
  });
  it('keeps texts, repeated weights and ordering intact across persistence',()=>{
    const questions=Array.from({length:25},(_,index)=>ready(index));questions[0].options.forEach(option=>{option.weight=2;});
    const reordered=moveQuestion(questions,questions[0].id,1);expect(reordered[1]).toBe(questions[0]);
    expect(questions[0].text).toBe('Pergunta 0');const draft={...blankQuiz(),introSeen:true,status:'completed' as const,questions:reordered};
    expect(parseQuiz(JSON.stringify(draft))).toEqual(draft);
    expect(moveQuestion(questions,questions[0].id,-1)).toBe(questions);
  });
  it('calculates 25–100% using option weights, with consistent rounding and complete answers',()=>{
    const questions=Array.from({length:6},(_,index)=>ready(index));
    const answers=(choice:number)=>Object.fromEntries(questions.map(question=>[question.id,question.options[choice].id]));
    expect(compatibilityScore(questions,answers(3))).toBe(25);expect(compatibilityScore(questions,answers(0))).toBe(100);
    questions[0].options[3].weight=2;expect(compatibilityScore(questions,answers(3))).toBe(29);
    questions.forEach(question=>question.options.forEach(option=>{option.weight=3;}));expect(compatibilityScore(questions,answers(0))).toBe(75);
    expect(()=>compatibilityScore(questions,{})).toThrow();expect(()=>compatibilityScore([],{})).toThrow();
  });
  it('rejects malformed alternatives, invalid weights, duplicate IDs and excessive texts without altering data',()=>{
    const draft={...blankQuiz(),questions:[ready()]};
    const raw=JSON.stringify(draft);expect(parseQuiz(raw)).toEqual(draft);
    for(const weight of [0,5,1.5,'4']){const bad=JSON.parse(raw);bad.questions[0].options[0].weight=weight;expect(()=>parseQuiz(JSON.stringify(bad))).toThrow();}
    const missing=JSON.parse(raw);missing.questions[0].options.pop();expect(()=>parseQuiz(JSON.stringify(missing))).toThrow();
    const duplicate=JSON.parse(raw);duplicate.questions[0].options[0].id=duplicate.questions[0].id;expect(()=>parseQuiz(JSON.stringify(duplicate))).toThrow();
    draft.questions[0].text='a'.repeat(limits.question+1);expect(validQuestion(draft.questions[0])).toBe(false);expect(()=>parseQuiz(JSON.stringify(draft))).toThrow();
  });
  it('preserves the last saved draft on quota errors and leaves unreadable storage untouched',()=>{
    const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
    const draft={...blankQuiz(),questions:[ready()]};expect(quizRepository.save(draft)).toEqual({ok:true});expect(quizRepository.load().draft).toEqual(draft);
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:()=>{throw new Error('quota');}});
    expect(quizRepository.save({...draft,questions:[]})).toMatchObject({ok:false});expect(values.get(herQuizKey)).toBe(JSON.stringify(draft));
    values.set(herQuizKey,'broken');expect(quizRepository.load().error).toBeTruthy();expect(values.get(herQuizKey)).toBe('broken');
  });
});
