import { describe, expect, it } from 'vitest';
import technical from './technical-test-manifest.json';
import manual from './confirmed-manual-test-manifest.json';
import { cleanupHerTestStorage, cleanupKey, legacyCleanupKey } from './cleanup';
const galaxy='meu-universo.her-universe.v1',quiz='meu-universo.her-compatibility.v1',couple='meu-universo.her-couple.v1';
function storage() {
  const values=new Map<string,string>();
  return { values, getItem:(key:string)=>values.get(key)??null, setItem:(key:string,value:string)=>{values.set(key,value);}, removeItem:(key:string)=>{values.delete(key);} };
}
function seed(s:ReturnType<typeof storage>) {
  s.setItem(galaxy,JSON.stringify(technical.galaxy));s.setItem(quiz,JSON.stringify(technical.compatibility));s.setItem(couple,JSON.stringify(technical.couple));
}
describe('bounded delivery cleanup',()=>{
  it('runs v2 even when v1 previously marked the browser complete',()=>{
    const s=storage();s.setItem(legacyCleanupKey,JSON.stringify({removed:[],version:1}));seed(s);
    expect(cleanupHerTestStorage(s).removed).toEqual([quiz,couple,galaxy]);expect(s.getItem(cleanupKey)).not.toBeNull();
  });
  it('resumes a partially failed cleanup while preserving changed legitimate data',()=>{
    const s=storage();seed(s);let calls=0;
    expect(cleanupHerTestStorage({...s,removeItem:(key:string)=>{if(++calls===2)throw new Error('interrupted');s.removeItem(key);}}).completed).toBe(false);
    expect(s.getItem(quiz)).toBeNull();expect(cleanupHerTestStorage(s).removed).toEqual([couple,galaxy]);expect(s.getItem(galaxy)).toBeNull();
    const other=storage();seed(other);calls=0;cleanupHerTestStorage({...other,removeItem:(key:string)=>{if(++calls===2)throw new Error('interrupted');other.removeItem(key);}});
    other.setItem(quiz,'new legitimate quiz');expect(cleanupHerTestStorage(other).removed).toEqual([couple]);expect(other.getItem(galaxy)).not.toBeNull();expect(other.getItem(quiz)).toBe('new legitimate quiz');
  });
  it('preserves an isolated galaxy after v1 because colors alone cannot prove its origin',()=>{
    const s=storage();s.setItem(galaxy,JSON.stringify(technical.galaxy));s.setItem(legacyCleanupKey,JSON.stringify({removed:[quiz,couple],version:1}));expect(cleanupHerTestStorage(s).removed).toEqual([]);expect(s.getItem(galaxy)).not.toBeNull();
  });
  it('cleans the user-confirmed manual run but preserves unrelated empty quizzes',()=>{
    const s=storage();s.setItem(galaxy,JSON.stringify(manual.galaxy));s.setItem(quiz,JSON.stringify(manual.compatibility));s.setItem(couple,JSON.stringify(manual.couple));expect(cleanupHerTestStorage(s).removed).toEqual([quiz,galaxy,couple]);
    const other=storage();other.setItem(couple,JSON.stringify(manual.couple));expect(cleanupHerTestStorage(other).removed).toEqual([]);expect(other.getItem(couple)).not.toBeNull();
  });
  it('preserves a legitimate couple quiz and galaxy beside the old manual compatibility quiz',()=>{
    const s=storage();s.setItem(galaxy,JSON.stringify(manual.galaxy));s.setItem(quiz,JSON.stringify(manual.compatibility));s.setItem(couple,'legitimate couple draft');
    expect(cleanupHerTestStorage(s).removed).toEqual([quiz]);expect(s.getItem(galaxy)).not.toBeNull();expect(s.getItem(couple)).toBe('legitimate couple draft');
  });
  it('does not remove a galaxy if a new quiz appeared after the deletion plan was interrupted',()=>{
    const s=storage();s.setItem(galaxy,JSON.stringify(manual.galaxy));s.setItem(quiz,JSON.stringify(manual.compatibility));let calls=0;
    cleanupHerTestStorage({...s,removeItem:(key:string)=>{if(++calls===2)throw new Error('interrupted');s.removeItem(key);}});
    s.setItem(couple,'new legitimate quiz');expect(cleanupHerTestStorage(s).removed).toEqual([]);expect(s.getItem(galaxy)).not.toBeNull();
  });
  it('removes only the exact confirmed test and preserves all unrelated keys',()=>{
    const s=storage();seed(s);s.setItem('admin-session','private');s.setItem('garden','original');s.setItem('meu-universo.creator-auth.v1','unknown');
    expect(cleanupHerTestStorage(s).removed).toEqual([quiz,couple,galaxy]);expect(s.getItem('admin-session')).toBe('private');expect(s.getItem('garden')).toBe('original');expect(s.getItem('meu-universo.creator-auth.v1')).toBe('unknown');
  });
  it('preserves same colors and test-like text with different IDs, edits or extra questions',()=>{
    const s=storage();seed(s);const edited=structuredClone(technical.compatibility);edited.questions[0].id='new-legitimate-id';s.setItem(quiz,JSON.stringify(edited));
    expect(cleanupHerTestStorage(s).removed).toEqual([couple]);expect(s.getItem(quiz)).toBe(JSON.stringify(edited));expect(s.getItem(galaxy)).not.toBeNull();
  });
  it('never deletes a new draft on later loads, even if identical to the old fixture',()=>{
    const s=storage();expect(cleanupHerTestStorage(s).completed).toBe(true);seed(s);expect(cleanupHerTestStorage(s).removed).toEqual([]);expect(s.getItem(quiz)).not.toBeNull();
  });
  it('preserves malformed and uncertain backups and remains usable with blocked storage',()=>{
    const s=storage();s.setItem(quiz,'broken');s.setItem('meu-universo.before-remote-import.v1','unknown');expect(cleanupHerTestStorage(s).removed).toEqual([]);expect(s.getItem(quiz)).toBe('broken');
    expect(cleanupHerTestStorage({...s,getItem:()=>{throw new Error('blocked');}}).completed).toBe(false);
  });
  it('does not mark an incomplete cleanup as complete',()=>{
    const s=storage();seed(s);expect(cleanupHerTestStorage({...s,removeItem:()=>{throw new Error('blocked');}}).completed).toBe(false);expect(s.getItem(cleanupKey)).toBeNull();
  });
});
