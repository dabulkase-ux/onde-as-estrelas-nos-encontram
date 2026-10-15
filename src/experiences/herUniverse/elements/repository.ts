import {validateBlackHoles,crystalIds,type HerBlackHole} from '../../../../supabase/functions/_shared/herUniverseDomain';
import {localUniverseChangeEvent} from '../localChange';
export type {HerBlackHole};
export const herBlackHolesKey='meu-universo.her-black-holes.v1';
export const holesRepository={
 load():{holes:HerBlackHole[];error:string}{try{return {holes:validateBlackHoles(JSON.parse(localStorage.getItem(herBlackHolesKey)??'[]')),error:''};}catch{return {holes:[],error:'Não foi possível ler seus elementos. Os dados foram preservados.'};}},
 save(holes:HerBlackHole[]){try{localStorage.setItem(herBlackHolesKey,JSON.stringify(validateBlackHoles(holes)));window.dispatchEvent(new Event(localUniverseChangeEvent));return '';}catch{return 'Não foi possível salvar os elementos. Seu último salvamento foi preservado.';}},
};
export function blankHole(position:HerBlackHole['position']):HerBlackHole{return {id:`her-hole-${crypto.randomUUID()}`,position,crystals:crystalIds.map(id=>({id,title:'',text:''})),starLetter:null};}
export function elementPosition(existing:readonly {position:readonly number[];radius:number}[],radius:number,random=Math.random):[number,number,number]{
 for(let ring=0;;ring++){
  const r=5+ring*2.8,slots=Math.ceil(Math.PI*2*r/2.8),candidates:[number,number,number][]=[];
  for(let i=0;i<slots;i++){const angle=i/slots*Math.PI*2,p:[number,number,number]=[Math.cos(angle)*r,Math.sin(angle)*r*.7,-2-ring*.3];
   if([[0,0,0],[0,3,0],[0,1.2,0]].every(c=>Math.hypot(...p.map((v,i)=>v-c[i]))>radius+1)&&existing.every(e=>Math.hypot(...p.map((v,i)=>v-e.position[i]))>radius+e.radius+.5))candidates.push(p);
  }
  if(candidates.length)return candidates[Math.floor(random()*candidates.length)];
 }
}
