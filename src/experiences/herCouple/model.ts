import { limits as sharedLimits } from '../herCompatibility/model';
export { moveQuestion } from '../herCompatibility/model';
export type Option = { id: string; text: string; correct: boolean };
export type Question = { id: string; text: string; options: [Option,Option,Option,Option]; comment: string };
export type QuizDraft = { version: 1; introSeen: boolean; status: 'draft'|'completed'; questions: Question[] };
export const limits = { ...sharedLimits, comment: 1000 };
export const blankQuiz = (): QuizDraft => ({ version:1,introSeen:false,status:'draft',questions:[] });
export function newQuestion(): Question {
  return { id:crypto.randomUUID(),text:'',comment:'',options:Array.from({length:4},()=>({id:crypto.randomUUID(),text:'',correct:false})) as Question['options'] };
}
export function validQuestion(question: Question): boolean {
  return Boolean(question.text.trim()) && question.text.length<=limits.question && question.comment.length<=limits.comment &&
    question.options.length===4 && question.options.every(option=>Boolean(option.text.trim()) && option.text.length<=limits.option && typeof option.correct==='boolean') &&
    question.options.some(option=>option.correct);
}
export function canComplete(questions:Question[]): boolean { return questions.length>=5 && questions.every(validQuestion); }
export function isCorrectAnswer(question:Question, selected:readonly string[]): boolean {
  return selected.length===1 && question.options.some(option=>option.id===selected[0] && option.correct);
}
export function coupleScore(questions:Question[], answers:Record<string,string[]>): number {
  if(!questions.length || !questions.every(validQuestion))throw new Error('O quiz precisa de perguntas válidas.');
  const points=questions.reduce((sum,question)=>{
    const selected=answers[question.id];
    if(!Array.isArray(selected)||selected.length!==1)throw new Error('Confirme uma única alternativa para todas as perguntas.');
    if(selected.some(id=>!question.options.some(option=>option.id===id)))throw new Error('Alternativa desconhecida.');
    return sum+Number(isCorrectAnswer(question,selected));
  },0);
  return Math.round(points/questions.length*100);
}
export function parseQuiz(raw:string):QuizDraft {
  if(raw.length>limits.storageCharacters)throw new Error('O rascunho ultrapassa o tamanho técnico suportado.');
  const value=JSON.parse(raw);
  if(value?.version!==1||!Array.isArray(value.questions)||!['draft','completed'].includes(value.status))throw new Error('Rascunho inválido.');
  const ids=new Set<string>();
  const identify=(id:unknown)=>{if(typeof id!=='string'||!id||id.length>100||ids.has(id))throw new Error('Identificador inválido.');ids.add(id);return id;};
  const text=(text:unknown,maximum:number)=>{if(typeof text!=='string'||text.length>maximum)throw new Error('Texto inválido.');return text;};
  const questions:Question[]=value.questions.map((question:Question)=>{
    const id=identify(question?.id);
    if(!Array.isArray(question.options)||question.options.length!==4)throw new Error('São necessárias quatro alternativas.');
    const options=question.options.map(option=>{
      if(typeof option?.correct!=='boolean')throw new Error('Marcação de resposta inválida.');
      return {id:identify(option.id),text:text(option.text,limits.option),correct:option.correct};
    }) as Question['options'];
    return {id,text:text(question.text,limits.question),comment:text(question.comment??'',limits.comment),options};
  });
  return {version:1,introSeen:value.introSeen===true,status:value.status==='completed'&&canComplete(questions)?'completed':'draft',questions};
}
