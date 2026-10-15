export type Kind = 'compatibility' | 'couple';
export type PublicQuestion = {id:string;text:string;options:{id:string;text:string}[]};
export type StoredOption = {id:string;text:string;weight?:number;correct?:boolean};
export type StoredQuiz = {version:1;introSeen:boolean;status:'draft'|'completed';questions:{id:string;text:string;options:StoredOption[];comment?:string}[]};
export type Galaxy = {version:1;accepted:boolean;created:boolean;colors:('azul'|'verde'|'rosa'|'roxo'|'dourado'|'branco'|'vermelho'|'turquesa')[];stage:'travel'|'colors'|'creating'|'ready';dialogue?:number};
export type UniverseDocument = {version:1;galaxy:Galaxy;configuration:{generator:'spiral-v1'};compatibility:StoredQuiz;couple:StoredQuiz};
export type Publication = {id:string;universeId:string;galaxy:Galaxy;configuration:UniverseDocument['configuration'];compatibility:PublicQuestion[]|null;couple:PublicQuestion[]|null};
export const colors=['azul','verde','rosa','roxo','dourado','branco','vermelho','turquesa'];
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Dados inválidos.');return value as Record<string,unknown>;}
function text(value:unknown,max:number,filled=false):string{if(typeof value!=='string'||value.length>max||(filled&&!value.trim()))throw new Error('Texto inválido.');return value;}
export function validateDocument(input:unknown):UniverseDocument{
  if(JSON.stringify(input).length>2_100_000)throw new Error('O universo ultrapassa o limite técnico de armazenamento.');
  const doc=object(input),g=object(doc.galaxy),config=object(doc.configuration);
  if(doc.version!==1||config.generator!=='spiral-v1'||g.version!==1||g.accepted!==true||typeof g.created!=='boolean'||!Array.isArray(g.colors)||g.colors.length>2||new Set(g.colors).size!==g.colors.length||g.colors.some(c=>!colors.includes(String(c)))||!['travel','colors','creating','ready'].includes(String(g.stage))||(g.created&&(g.colors.length===0||g.stage!=='ready')))throw new Error('Galáxia inválida.');
  const parse=(kind:Kind):StoredQuiz=>{
    const quiz=object(doc[kind]);if(quiz.version!==1||!['draft','completed'].includes(String(quiz.status))||!Array.isArray(quiz.questions)||JSON.stringify(quiz).length>1_000_000)throw new Error('Quiz inválido.');
    const ids=new Set<string>();const id=(value:unknown)=>{const s=text(value,100,true);if(ids.has(s))throw new Error('Identificador duplicado.');ids.add(s);return s;};
    const questions=quiz.questions.map(value=>{const q=object(value);const qid=id(q.id);if(!Array.isArray(q.options)||q.options.length!==4)throw new Error('São necessárias quatro alternativas.');
      const options:StoredOption[]=q.options.map(value=>{const o=object(value),oid=id(o.id),content=text(o.text,240);if(kind==='compatibility'&&![1,2,3,4].includes(Number(o.weight)))throw new Error('Peso inválido.');if(kind==='compatibility'&&typeof o.weight!=='number')throw new Error('Peso inválido.');if(kind==='couple'&&typeof o.correct!=='boolean')throw new Error('Resposta inválida.');return {id:oid,text:content,...(kind==='compatibility'?{weight:o.weight as number}:{correct:o.correct as boolean})};});
      return {id:qid,text:text(q.text,600),options,...(kind==='couple'?{comment:text(q.comment??'',1000)}:{})};});
    if(quiz.status==='completed'&&(questions.length<5||questions.some(q=>!q.text.trim()||q.options.some(o=>!o.text.trim())||(kind==='couple'&&!q.options.some(o=>o.correct)))))throw new Error('Quiz concluído inválido.');
    return {version:1,introSeen:quiz.introSeen===true,status:quiz.status as StoredQuiz['status'],questions};
  };
  return {version:1,configuration:{generator:'spiral-v1'},galaxy:{version:1,accepted:true,created:g.created,colors:g.colors as Galaxy['colors'],stage:g.stage as Galaxy['stage'],...(g.stage==='travel'?{dialogue:Math.max(0,Math.min(3,Number(g.dialogue)||0))}:{})},compatibility:parse('compatibility'),couple:parse('couple')};
}
export function publicPublication(id:string,universeId:string,input:unknown):Publication{
  const doc=validateDocument(input);if(!doc.galaxy.created)throw new Error('Galáxia não publicada.');
  const quiz=(kind:Kind)=>doc[kind].status==='completed'?doc[kind].questions.map(q=>({id:q.id,text:q.text,options:q.options.map(o=>({id:o.id,text:o.text}))})):null;
  return {id,universeId,galaxy:doc.galaxy,configuration:doc.configuration,compatibility:quiz('compatibility'),couple:quiz('couple')};
}
