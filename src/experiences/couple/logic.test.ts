import coupleSource from './CoupleQuiz.tsx?raw';
import invitationSource from './Invitation.tsx?raw';
import appSource from '../../App.tsx?raw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { acceptanceFooter, acceptanceMessage, acceptanceTitle, coupleQuestions, lastStar, letters, letterTitle, loveLetter, specialFeedbacks, wrongFeedback } from './data';
import { coupleStorageKey, emptyCoupleProgress, getAnswerFeedback, isCorrect, nextEscapePoint, readCoupleProgress, saveCoupleProgress } from './logic';
afterEach(() => vi.unstubAllGlobals());
describe('Quiz de Casal', () => {
 it('keeps exactly ten questions, four options and the approved answers', () => {
  expect(coupleQuestions).toHaveLength(10);
  expect(coupleQuestions.map(q => q.correct)).toEqual(['A','C','A','A','B','C','C','C','A','B']);
  coupleQuestions.forEach((q,index) => { expect(q.options).toHaveLength(4); expect(letters.filter(l => isCorrect(index,l))).toEqual([q.correct]); expect(q.feedback.length).toBeGreaterThan(10); });
 });
 it('persists and resumes independently without storing an invitation choice', () => {
  const values = new Map([['meu-universo.compatibility.v1','untouched']]);
  vi.stubGlobal('localStorage',{getItem:(key:string) => values.get(key),setItem:(key:string,value:string) => values.set(key,value)});
  const progress = {answers:coupleQuestions.map(q => q.correct),completed:true};
  expect(saveCoupleProgress(progress)).toBe(true); expect(readCoupleProgress()).toEqual(progress);
  expect(values.get('meu-universo.compatibility.v1')).toBe('untouched');
  expect(Object.keys(JSON.parse(values.get(coupleStorageKey)!))).toEqual(['answers','completed']);
  values.set(coupleStorageKey,JSON.stringify({answers:['A',null,'C',...Array(7).fill('A')],completed:true}));
  expect(readCoupleProgress()).toEqual({answers:['A',...Array(9).fill(null)],completed:false});
 });
 it('handles malformed data and unavailable storage', () => {
  vi.stubGlobal('localStorage',{getItem:()=>'{',setItem:()=>{throw new Error('denied');}});
  expect(readCoupleProgress()).toEqual(emptyCoupleProgress()); expect(saveCoupleProgress(emptyCoupleProgress())).toBe(false);
 });
 it('moves to distant, bounded positions even in repeated attempts', () => {
  let previous = {x:.5,y:.5};
  for(let i=0;i<100;i++) { const next=nextEscapePoint(previous,()=>i/100); expect(next.x).toBeGreaterThanOrEqual(0); expect(next.x).toBeLessThanOrEqual(1); expect(next.y).toBeGreaterThanOrEqual(0); expect(next.y).toBeLessThanOrEqual(1); expect(Math.hypot(next.x-previous.x,next.y-previous.y)).toBeGreaterThan(.4); previous=next; }
 });
});

it('dispatches all 40 answers while preserving official correctness', () => {
 const expectedSpecial = [['B','C'],['B'],['B'],['B','C'],['A','C'],['A','B','D'],['A','B','D'],['A','B','D'],['B','C','D'],['A','C','D']];
 let specialCount=0; let standardCount=0;
 coupleQuestions.forEach((question,index) => letters.forEach(answer => {
  const result=getAnswerFeedback(index,answer);
  if (answer===question.correct) { expect(result).toEqual({kind:'correct',text:question.feedback}); expect(isCorrect(index,answer)).toBe(true); }
  else if(expectedSpecial[index].includes(answer)) { expect(result).toEqual({kind:'special',text:specialFeedbacks[index][answer]}); expect(isCorrect(index,answer)).toBe(false); specialCount++; }
  else { expect(result).toEqual({kind:'standard',text:wrongFeedback}); expect(isCorrect(index,answer)).toBe(false); standardCount++; }
 }));
 expect(specialCount).toBe(23); expect(standardCount).toBe(7);
});

it('contains no emoji in data or interface text, including the ending and invitation', () => {
 const emoji=/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u2661|\uFE0F|\u20E3)/u;
 expect(JSON.stringify({coupleQuestions,specialFeedbacks,wrongFeedback,lastStar,letterTitle,loveLetter,acceptanceTitle,acceptanceMessage,acceptanceFooter})).not.toMatch(emoji);
 for(const source of [coupleSource,invitationSource,appSource.split('\n').find(line=>line.includes('className="couple-access"')) ?? '']) expect(source).not.toMatch(emoji);
});

it('retains the ten approved question texts and forty alternatives in order', () => {
 expect(coupleQuestions.map(q=>q.text)).toEqual([
 'Quem você acha que sente mais ciúmes entre nós dois?', 'Qual detalhe seu mais me faz perder a noção do tempo?', 'Qual desses momentos entre nós dois eu guardo com um carinho especial?', 'Quem você acha que começou a demonstrar interesse primeiro?', 'Se eu pudesse escolher um momento especial pra viver com você, qual seria?', 'O que você acha que eu tenho vontade de te dizer, mas nem sempre consigo?', 'O que você acha que eu mais tenho medo de perder entre nós dois?', 'Se eu pudesse te fazer uma promessa através das minhas atitudes, qual seria?', 'Se eu pudesse voltar no tempo e mudar uma coisa entre nós, o que seria?', 'Por que você acha que eu criei um universo inteiro para você?',
 ]);
 expect(coupleQuestions.map(q=>q.options)).toEqual([
 ['Eu, mas tento disfarçar.', 'Você, mesmo fingindo que não.', 'Os dois, só que cada um demonstra de um jeito.', 'Nenhum dos dois, somos tranquilinhos.'],
 ['Seu sorriso, principalmente quando você ri de verdade.', 'Seus olhos, porque eu poderia passar horas admirando eles.', 'Seu jeito de falar comigo e cuidar de mim.', 'Seu cabelo e os pequenos detalhes da sua aparência.'],
 ['Quando você ficou comigo e cuidou de mim enquanto eu estava embriagado.', 'Quando a gente passou horas conversando sem perceber o tempo.', 'Quando você me fez rir num dia em que eu não estava muito bem.', 'Quando a gente teve uma conversa que eu nunca mais esqueci.'],
 ['Eu, porque queria encontrar qualquer desculpa pra falar com você.', 'Você, porque foi quem começou a demonstrar interesse.', 'Os dois, porque a conversa simplesmente aconteceu.', 'Nenhum dos dois, porque tudo começou por acaso.'],
 ['Uma viagem inesquecível, só nós dois, conhecendo lugares novos.', 'Uma noite tranquila, conversando e olhando as estrelas.', 'Poder estar ao seu lado nos dias bons e nos difíceis.', 'Um encontro surpresa, planejado com todo carinho.'],
 ['Que eu penso em você até nos momentos mais aleatórios do dia.', 'Que eu fico procurando motivos pra puxar assunto com você.', 'Que às vezes tenho vontade de dizer o quanto você é especial pra mim, mas não sei como.', 'Que eu gostaria de ter mais momentos simples ao seu lado.'],
 ['As nossas conversas, mesmo quando não temos assunto.', 'A confiança que você deposita em mim.', 'A oportunidade de viver algo bonito com você.', 'Os pequenos momentos que fazem você sorrir.'],
 ['Fazer você sorrir, mesmo nos dias mais difíceis.', 'Te surpreender com flores e pequenos presentes.', 'Estar presente, te ouvir e cuidar de você, respeitando seu espaço.', 'Criar momentos inesquecíveis sempre que estivermos juntos.'],
 ['Ter criado coragem para demonstrar meus sentimentos mais cedo.', 'Ter aproveitado melhor cada conversa que tivemos.', 'Ter prestado mais atenção aos pequenos momentos ao seu lado.', 'Não mudar nada, porque cada momento me trouxe até você.'],
 ['Porque queria te surpreender com algo diferente.', 'Porque queria criar uma lembrança bonita que você pudesse revisitar.', 'Porque existem sentimentos que eu não consigo explicar só com palavras.', 'Porque queria mostrar o quanto gosto de criar coisas pensando em você.'],
 ]);
});

