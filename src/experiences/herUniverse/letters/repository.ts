import { validateLetters, type HerLetter } from '../../../../supabase/functions/_shared/herUniverseDomain';
import { localUniverseChangeEvent } from '../localChange';
export type { HerLetter };
export const herLettersKey='meu-universo.her-letters.v1';
export const lettersRepository={
 load():{letters:HerLetter[];error:string}{try{return {letters:validateLetters(JSON.parse(localStorage.getItem(herLettersKey)??'[]')),error:''};}catch{return {letters:[],error:'Não foi possível ler suas cartinhas. Os dados existentes foram preservados.'};}},
 save(letters:HerLetter[]){try{localStorage.setItem(herLettersKey,JSON.stringify(validateLetters(letters)));window.dispatchEvent(new Event(localUniverseChangeEvent));return '';}catch{return 'Não foi possível salvar as cartinhas. Seu último salvamento foi preservado.';}},
};
/** Random choice among separated slots. Positions are generated only on creation. */
export function newLetterPosition(letters:readonly HerLetter[],random= Math.random):HerLetter['position']{
 const candidates:HerLetter['position'][]=[];
 for(let ring=0;!candidates.length;ring++){
  const radius=4.5+ring*1.6,slots=Math.ceil(2*Math.PI*radius/1.6);
  for(let i=0;i<slots;i++){
   const angle=i/slots*Math.PI*2;
   const p:HerLetter['position']=[Math.cos(angle)*radius,Math.sin(angle)*radius*.7,-1-ring*.25];
   if([[0,0,0],[0,3,0],[0,1.2,0]].every(center=>Math.hypot(...p.map((v,i)=>v-center[i]))>=2)&&letters.every(l=>Math.hypot(...p.map((v,i)=>v-l.position[i]))>=1.3))candidates.push(p);
  }
 }
 return candidates[Math.floor(random()*candidates.length)];
}
