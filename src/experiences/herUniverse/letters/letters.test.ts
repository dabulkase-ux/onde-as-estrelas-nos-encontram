import {localDocument,restoreLocalDocument} from '../remote/repository';
import {afterEach,expect,it,vi} from 'vitest';
import {lettersRepository,newLetterPosition,herLettersKey,type HerLetter} from './repository';
import {validateDocument,validateLetters,publicPublication} from '../../../../supabase/functions/_shared/herUniverseDomain';
import {readyDocument,universeMock} from '../../../../tests/helpers/herUniverseMock';
afterEach(()=>vi.unstubAllGlobals());
const letter=(id='her-letter-test'):HerLetter=>({id,title:'Minha mensagem',paragraphs:['Primeiro parágrafo.','Outro parágrafo.'],position:[4.5,0,-1]});
it('keeps legacy documents intact and round-trips letter texts and positions',()=>{
 const old=readyDocument();expect(validateDocument(old)).toEqual(old);
 const document={...old,letters:[letter()]};expect(validateDocument(document)).toEqual(document);
 expect(publicPublication('p','u',document).letters).toEqual(document.letters);
});
it('rejects duplicate IDs, invalid positions and empty messages without accepting HTML as markup',()=>{
 expect(()=>validateLetters([letter(),letter()])).toThrow();
 for(const position of [[NaN,0,0],[0,Infinity,0],[0,0],[1001,0,0]])expect(()=>validateLetters([{...letter(),position}])).toThrow();
 expect(()=>validateLetters([{...letter(),paragraphs:['  ']}])).toThrow();
 expect(validateLetters([{...letter(),paragraphs:['<script>alert(1)</script>']}])[0].paragraphs[0]).toContain('<script>');
});
it('creates many separated random positions without moving existing letters or occupying the core',()=>{
 const letters:HerLetter[]=[];
 for(let index=0;index<150;index++){
  const previous=JSON.stringify(letters),position=newLetterPosition(letters,()=>.47);
  expect(JSON.stringify(letters)).toBe(previous);expect(Math.hypot(position[0],position[1])).toBeGreaterThan(3);for(const center of [[0,0,0],[0,3,0],[0,1.2,0]])expect(Math.hypot(...position.map((v,i)=>v-center[i]))).toBeGreaterThanOrEqual(2);
  for(const other of letters)expect(Math.hypot(...position.map((v,i)=>v-other.position[i]))).toBeGreaterThanOrEqual(1.3);
  letters.push({...letter(`her-letter-${index}`),position});
 }
 expect(newLetterPosition([],()=>0)).not.toEqual(newLetterPosition([],()=>.5));
});
it('preserves the last saved letters when browser quota fails and leaves broken data untouched',()=>{
 const data=new Map<string,string>();vi.stubGlobal('window',{dispatchEvent:vi.fn()});vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});
 expect(lettersRepository.save([letter()])).toBe('');expect(lettersRepository.load().letters).toEqual([letter()]);
 vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:()=>{throw Error('quota');}});
 expect(lettersRepository.save([])).not.toBe('');expect(lettersRepository.load().letters).toEqual([letter()]);
 data.set(herLettersKey,'broken');expect(lettersRepository.load().error).not.toBe('');expect(data.get(herLettersKey)).toBe('broken');
});
it('publishes letters through the real handler using an isolated database fixture, preserving both quizzes',async()=>{
 const mock=universeMock(),doc={...readyDocument(),letters:[letter()]};
 const response=await mock.request({action:'publish',revision:0,document:doc});expect(response.status).toBe(200);
 const visible=await (await mock.request({action:'public'})).json();expect(visible.publication.letters).toEqual(doc.letters);
 expect(mock.universe?.document.compatibility).toEqual(doc.compatibility);expect(mock.universe?.document.couple).toEqual(doc.couple);
 expect((await (await mock.request({action:'owner'})).json()).capabilities.letters).toBe(true);
});

it('backs up and restores letters together with the existing galaxy and quizzes, preserving original-universe storage',()=>{
 const data=new Map<string,string>([['meu-universo.letters.v1','original letters preserved']]);vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)});
 const document={...readyDocument(),letters:[letter()]};restoreLocalDocument(document);expect(localDocument()).toEqual(document);expect(data.get('meu-universo.letters.v1')).toBe('original letters preserved');expect(JSON.parse(data.get('meu-universo.before-remote-import.v1')!).keys).toContain(herLettersKey);
});
