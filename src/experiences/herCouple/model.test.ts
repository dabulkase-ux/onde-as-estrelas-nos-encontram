import { afterEach, describe, expect, it, vi } from 'vitest';
import { blankQuiz, canComplete, coupleScore, isCorrectAnswer, limits, moveQuestion, newQuestion, parseQuiz, validQuestion, type Question } from './model';
import { coupleRepository, herCoupleKey } from './repository';
import { herQuizKey } from '../herCompatibility/repository';
function ready(index=0):Question {const question=newQuestion();question.text=`Pergunta ${index}`;question.options.forEach((option,index)=>{option.text=`Resposta ${index}`;option.correct=index===0||index===2;});return question;}
afterEach(()=>vi.unstubAllGlobals());
describe('visitor couple quiz',()=>{
  it('starts empty with stable IDs, exactly four editable alternatives and no preselected correct answers',()=>{
    expect(blankQuiz().questions).toEqual([]);const question=newQuestion();expect(question.options).toHaveLength(4);expect(question.options.every(option=>!option.correct)).toBe(true);
    expect(new Set([question.id,...question.options.map(option=>option.id)]).size).toBe(5);
    const id=question.options[0].id;question.options[0].correct=true;question.options[0].text='Uma verdade';expect(question.options[0].id).toBe(id);
  });
  it('requires filled texts and at least one correct answer, permits one through four and optional comments',()=>{
    const question=ready();question.options.forEach(option=>{option.correct=false;});expect(validQuestion(question)).toBe(false);
    for(let count=1;count<=4;count++){question.options.forEach((option,index)=>{option.correct=index<count;});expect(validQuestion(question)).toBe(true);expect(isCorrectAnswer(question,[question.options[0].id])).toBe(true);}
    question.comment='';expect(validQuestion(question)).toBe(true);question.options[3].text=' ';expect(validQuestion(question)).toBe(false);
  });
  it('requires five questions for completion and permits more than twenty',()=>{
    const questions=Array.from({length:35},(_,index)=>ready(index));expect(canComplete(questions.slice(0,4))).toBe(false);expect(canComplete(questions)).toBe(true);
    questions[30].text='';expect(canComplete(questions)).toBe(false);
  });
  it('accepts either B or D alone, rejects A and multiple participant selections',()=>{
    const question=ready();question.options.forEach((option,index)=>{option.correct=index===1||index===3;});
    const [a,b,c,d]=question.options.map(option=>option.id);
    expect(isCorrectAnswer(question,[b])).toBe(true);expect(isCorrectAnswer(question,[d])).toBe(true);
    expect(isCorrectAnswer(question,[a])).toBe(false);expect(isCorrectAnswer(question,[c])).toBe(false);
    expect(isCorrectAnswer(question,[b,d])).toBe(false);expect(isCorrectAnswer(question,[b,b])).toBe(false);
    expect(isCorrectAnswer(question,[])).toBe(false);expect(isCorrectAnswer(question,['unknown'])).toBe(false);
  });
  it('scores one point per accepted alternative from 0 to 100, with consistent rounding',()=>{
    const questions=Array.from({length:3},(_,index)=>ready(index));
    const wrong=Object.fromEntries(questions.map(question=>[question.id,[question.options[1].id]]));
    const correct=Object.fromEntries(questions.map(question=>[question.id,[question.options[0].id]]));
    expect(coupleScore(questions,wrong)).toBe(0);expect(coupleScore(questions,correct)).toBe(100);
    expect(coupleScore(questions,{...wrong,[questions[0].id]:correct[questions[0].id]})).toBe(33);
    expect(()=>coupleScore(questions,{...correct,[questions[0].id]:questions[0].options.filter(option=>option.correct).map(option=>option.id)})).toThrow();
    expect(()=>coupleScore(questions,{})).toThrow();expect(()=>coupleScore([],{})).toThrow();
  });
  it('persists text, correct sets, optional comments and reordered IDs without altering the source',()=>{
    const questions=Array.from({length:25},(_,index)=>ready(index));questions[0].comment='Explicação\ncom outra linha.';
    const moved=moveQuestion(questions,questions[0].id,1);expect(moved[1]).toBe(questions[0]);expect(questions[0].text).toBe('Pergunta 0');
    const draft={...blankQuiz(),introSeen:true,status:'completed' as const,questions:moved};expect(parseQuiz(JSON.stringify(draft))).toEqual(draft);
    expect(moveQuestion(questions,questions[0].id,-1)).toBe(questions);
    expect(parseQuiz(JSON.stringify({...draft,questions:questions.slice(0,4)})).status).toBe('draft');
  });
  it('rejects invalid flags, missing alternatives, duplicate IDs and excessive text',()=>{
    const raw=JSON.stringify({...blankQuiz(),questions:[ready()]});
    for(const invalid of ['true',1,null]){const bad=JSON.parse(raw);bad.questions[0].options[0].correct=invalid;expect(()=>parseQuiz(JSON.stringify(bad))).toThrow();}
    const missing=JSON.parse(raw);missing.questions[0].options.pop();expect(()=>parseQuiz(JSON.stringify(missing))).toThrow();
    const duplicate=JSON.parse(raw);duplicate.questions[0].options[0].id=duplicate.questions[0].id;expect(()=>parseQuiz(JSON.stringify(duplicate))).toThrow();
    const excessive=JSON.parse(raw);excessive.questions[0].comment='a'.repeat(limits.comment+1);expect(()=>parseQuiz(JSON.stringify(excessive))).toThrow();
    expect(()=>parseQuiz(' '.repeat(limits.storageCharacters+1))).toThrow();
  });
  it('uses a separate key, survives quota failures and never overwrites unreadable data silently',()=>{
    const data=new Map<string,string>([[herQuizKey,'compatibility-preserved']]);vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});
    const draft={...blankQuiz(),questions:[ready()]};expect(coupleRepository.save(draft)).toEqual({ok:true});expect(coupleRepository.load().draft).toEqual(draft);expect(data.get(herQuizKey)).toBe('compatibility-preserved');
    vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:()=>{throw new Error('quota');}});
    expect(coupleRepository.save({...draft,questions:[]})).toMatchObject({ok:false});expect(data.get(herCoupleKey)).toBe(JSON.stringify(draft));
    data.set(herCoupleKey,'broken');expect(coupleRepository.load().error).toBeTruthy();expect(data.get(herCoupleKey)).toBe('broken');
  });
});
