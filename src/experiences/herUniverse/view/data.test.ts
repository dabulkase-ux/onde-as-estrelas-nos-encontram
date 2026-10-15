import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadUniverseView } from './data';
import { herUniverseKey } from '../progress';
import { herQuizKey } from '../../herCompatibility/repository';
import { herCoupleKey } from '../../herCouple/repository';
import { newQuestion as compatibilityQuestion } from '../../herCompatibility/model';
import { newQuestion as coupleQuestion } from '../../herCouple/model';
afterEach(()=>vi.unstubAllGlobals());
function store(){const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});return values;}
function galaxy(values:Map<string,string>){values.set(herUniverseKey,JSON.stringify({version:1,accepted:true,created:true,colors:['rosa','turquesa'],stage:'ready'}));}
function quizzes(values:Map<string,string>,status='completed'){
  values.set(herQuizKey,JSON.stringify({version:1,introSeen:true,status,questions:Array.from({length:5},()=>{const q=compatibilityQuestion();q.text='Pergunta criada';q.options.forEach(o=>{o.text='Texto escolhido';});return q;})}));
  values.set(herCoupleKey,JSON.stringify({version:1,introSeen:true,status,questions:Array.from({length:5},()=>{const q=coupleQuestion();q.text='Uma pergunta dela';q.options.forEach(o=>{o.text='Uma alternativa';});q.options[0].correct=true;return q;})}));
}
describe('read-only universe projection',()=>{
  it('shares saved colors and completed quizzes without modifying any key',()=>{const values=store();galaxy(values);quizzes(values);const before=[...values];const view=loadUniverseView();expect(view.galaxy?.colors).toEqual(['rosa','turquesa']);expect(view.compatibility).toHaveLength(5);expect(view.couple).toHaveLength(5);expect([...values]).toEqual(before);});
  it('keeps draft quizzes unavailable even when all their questions are valid',()=>{const values=store();galaxy(values);quizzes(values,'draft');const view=loadUniverseView();expect(view.galaxy).not.toBeNull();expect(view.compatibility).toBeNull();expect(view.couple).toBeNull();});
  it('handles missing, incompatible and corrupt galaxy data without inventing a universe',()=>{const values=store();expect(loadUniverseView().galaxy).toBeNull();values.set(herUniverseKey,'broken');expect(loadUniverseView().galaxy).toBeNull();values.set(herUniverseKey,JSON.stringify({version:99,accepted:true,created:true,colors:['azul']}));expect(loadUniverseView().galaxy).toBeNull();});
  it('preserves corrupted quizzes and still exposes the other completed experience',()=>{const values=store();galaxy(values);quizzes(values);values.set(herQuizKey,'broken');const before=[...values];const view=loadUniverseView();expect(view.compatibility).toBeNull();expect(view.couple).toHaveLength(5);expect(view.hasErrors).toBe(true);expect([...values]).toEqual(before);});
  it('handles storage access failures safely',()=>{vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');}});const view=loadUniverseView();expect(view.galaxy).toBeNull();expect(view.compatibility).toBeNull();expect(view.hasErrors).toBe(true);});
});
