import {describe,expect,it} from 'vitest';
import {draftKeys,draftResetKey,resetOldHerDrafts} from './draftReset';
function store(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};}
describe('one-time full draft reset',()=>{
 it('removes arbitrary old drafts and backups from both stores despite old cleanup markers',()=>{
  const local=store(),session=store();for(const s of [local,session]){for(const key of draftKeys)s.setItem(key,'old arbitrary draft');s.setItem('meu-universo.her-cleanup.2026-10-14.v2','done');s.setItem('meu-universo.admin-session.v1','keep');s.setItem('other-project','keep');s.setItem('meu-universo.compatibility.v1','original');}
  expect(resetOldHerDrafts(local,session).completed).toBe(true);expect(JSON.parse(local.getItem(draftKeys[0])!)).toEqual({version:1,accepted:true,colors:[],stage:'colors',created:false});
  for(const key of draftKeys){expect(session.getItem(key)).toBeNull();if(key!==draftKeys[0])expect(local.getItem(key)).toBeNull();}
  for(const s of [local,session]){expect(s.getItem('meu-universo.admin-session.v1')).toBe('keep');expect(s.getItem('other-project')).toBe('keep');expect(s.getItem('meu-universo.compatibility.v1')).toBe('original');}
 });
 it('runs once per browser and preserves new drafts even with a different tab session',()=>{
  const local=store(),session=store();resetOldHerDrafts(local,session);local.setItem(draftKeys[0],'new galaxy');local.setItem(draftKeys[1],'new quiz');const tab=store();tab.setItem(draftKeys[2],'new tab quiz');
  expect(resetOldHerDrafts(local,tab).removed).toEqual([]);expect(local.getItem(draftKeys[0])).toBe('new galaxy');expect(local.getItem(draftKeys[1])).toBe('new quiz');expect(tab.getItem(draftKeys[2])).toBe('new tab quiz');
 });
 it('does not create a creator draft in a pristine visitor browser',()=>{const local=store();resetOldHerDrafts(local,store());expect(local.getItem(draftKeys[0])).toBeNull();expect(JSON.parse(local.getItem(draftResetKey)!).status).toBe('done');});
 it('also restarts at colors when only an old backup remains',()=>{const local=store();local.setItem('meu-universo.before-remote-import.v1','old backup');expect(resetOldHerDrafts(local,store()).completed).toBe(true);expect(JSON.parse(local.getItem(draftKeys[0])!).stage).toBe('colors');expect(local.getItem('meu-universo.before-remote-import.v1')).toBeNull();});
 it('retains all data when the durable reset marker cannot be saved',()=>{const local=store();local.setItem(draftKeys[0],'old');expect(resetOldHerDrafts({...local,setItem:()=>{throw new Error('quota');}},store()).completed).toBe(false);expect(local.getItem(draftKeys[0])).toBe('old');});
 it('resumes an interruption and preserves changes made after the interruption',()=>{
  const local=store(),session=store();local.setItem(draftKeys[0],'old galaxy');local.setItem(draftKeys[1],'old quiz');let calls=0;
  expect(resetOldHerDrafts({...local,removeItem:(key:string)=>{if(++calls===2)throw new Error('interrupted');local.removeItem(key);}},session).completed).toBe(false);
  local.setItem(draftKeys[1],'new legitimate quiz');expect(resetOldHerDrafts(local,session).completed).toBe(true);expect(local.getItem(draftKeys[1])).toBe('new legitimate quiz');expect(JSON.parse(local.getItem(draftKeys[0])!).stage).toBe('colors');
 });
});
