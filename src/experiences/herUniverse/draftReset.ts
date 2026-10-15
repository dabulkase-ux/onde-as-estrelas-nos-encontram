// Explicit one-time reset requested for all old creation drafts, independent of
// the earlier test-signature migrations. No publication or admin key is included.
export const draftResetKey='meu-universo.her-draft-reset.2026-10-14.v1';
export const draftKeys=[
  'meu-universo.her-universe.v1',
  'meu-universo.her-compatibility.v1',
  'meu-universo.her-couple.v1',
  'meu-universo.remote-cache-binding.v1',
  'meu-universo.before-remote-import.v1',
  'meu-universo.her-cleanup.2026-10-14.v2.pending',
] as const;
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
type Entry={area:'local'|'session';key:string;raw:string|null};
type Plan={version:1;status:'pending';restart:boolean;entries:Entry[]};
const galaxyKey=draftKeys[0];
const freshGalaxy=JSON.stringify({version:1,accepted:true,colors:[],stage:'colors',created:false});
export function resetOldHerDrafts(local:Store,session:Store){
  const removed:string[]=[];
  try{
    const saved=local.getItem(draftResetKey);
    const previous=saved?JSON.parse(saved):null;
    if(previous?.version===1&&previous.status==='done')return {completed:true,removed};
    const stores={local,session};
    let plan:Plan;
    if(previous){
      if(previous.version!==1||previous.status!=='pending'||!Array.isArray(previous.entries)||!previous.entries.every((entry:Entry)=>entry&&['local','session'].includes(entry.area)&&draftKeys.includes(entry.key as typeof draftKeys[number])&&(entry.raw===null||typeof entry.raw==='string')))return {completed:false,removed};
      plan=previous;
    }else{
      const entries=Object.entries(stores).flatMap(([area,store])=>draftKeys.map(key=>({area:area as Entry['area'],key,raw:store.getItem(key)})));
      plan={version:1,status:'pending',restart:entries.some(entry=>entry.raw!==null),entries};
      // If this cannot be persisted, do not delete anything.
      local.setItem(draftResetKey,JSON.stringify(plan));
    }
    const newDraft=plan.entries.some(entry=>{
      if(!draftKeys.slice(0,3).some(key=>key===entry.key))return false;
      const current=stores[entry.area].getItem(entry.key);
      return current!==null&&current!==entry.raw&&!(entry.area==='local'&&entry.key===galaxyKey&&current===freshGalaxy);
    });
    for(const entry of plan.entries){
      if(entry.key===galaxyKey&&newDraft)continue;
      const store=stores[entry.area];
      if(entry.raw!==null&&store.getItem(entry.key)===entry.raw){store.removeItem(entry.key);removed.push(`${entry.area}:${entry.key}`);}
    }
    // Keep the narrative acceptance and restart at colors only for a browser
    // that had a creation draft. A new visitor does not become a creator.
    if(plan.restart&&local.getItem(galaxyKey)===null)local.setItem(galaxyKey,freshGalaxy);
    local.setItem(draftResetKey,JSON.stringify({version:1,status:'done',removed}));
    return {completed:true,removed};
  }catch{return {completed:false,removed};}
}
export function runHerDraftReset(){
  try{return resetOldHerDrafts(window.localStorage,window.sessionStorage);}
  catch{return {completed:false,removed:[]};}
}
