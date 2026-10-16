import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('public/stellar-mail-sw.js','utf8');
function worker(identity='arthur',generation=1){
 const memory=new Map<string,unknown>([['device',{device:'installation',secret:'capability'}]]),listeners:Record<string,(e:unknown)=>void>={};
 const show=vi.fn(),open=vi.fn(),focus=vi.fn(),navigate=vi.fn(async()=>({focus}));
 const state={identity,generation,enabled:true,endpoint:'https://push.example/device'};
 const fetch=vi.fn(async()=>({ok:true,json:async()=>state}));
 const db={close:()=>{},transaction:()=>{const tx:{oncomplete?:()=>void;objectStore?:()=>unknown}={};tx.objectStore=()=>({get:(key:string)=>{const r:{result?:unknown;onsuccess?:()=>void}={};queueMicrotask(()=>{r.result=memory.get(key);r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return r;},put:(v:unknown,k:string)=>memory.set(k,v)});return tx;}};
 const indexedDB={open:()=>{const r:{result:typeof db;onsuccess?:()=>void}={result:db};queueMicrotask(()=>r.onsuccess?.());return r;}};
 runInNewContext(source,{self:{location:{origin:'https://site.example'},registration:{pushManager:{getSubscription:async()=>({endpoint:state.endpoint})},showNotification:show},clients:{matchAll:async()=>[{url:'https://site.example/',navigate}],openWindow:open},addEventListener:(n:string,fn:(e:unknown)=>void)=>{listeners[n]=fn;}},fetch,indexedDB,URL,AbortSignal});
 const push=async(data:unknown)=>{let completion:Promise<unknown>|undefined;listeners.push({data:{json:()=>data},waitUntil:(p:Promise<unknown>)=>{completion=p;}});await completion;};
 const click=async(url:string)=>{let completion:Promise<unknown>|undefined;listeners.notificationclick({notification:{close:()=>{},data:{url}},waitUntil:(p:Promise<unknown>)=>{completion=p;}});await completion;};
 return {state,push,click,show,fetch,navigate,open};
}
it('verifies backend identity and generation, suppressing cross-galaxy or queued stale notifications',async()=>{
 const w=worker(),id=crypto.randomUUID();
 await w.push({id,recipient:'carol',generation:1});await w.push({id,recipient:'arthur',generation:0});expect(w.show).not.toHaveBeenCalled();
 await w.push({id,recipient:'arthur',generation:1,content:'must not leak'});await w.push({id,recipient:'arthur',generation:1});
 expect(w.show).toHaveBeenCalledTimes(1);expect(w.show.mock.calls[0]).toMatchObject(['Correio Estelar',{body:'Uma nova carta de Carol chegou ao seu universo.',data:{url:`https://site.example/?stellar-letter=${id}`}}]);expect(JSON.stringify(w.show.mock.calls)).not.toContain('must not leak');
 w.state.identity='carol';w.state.generation=2;await w.push({id:crypto.randomUUID(),recipient:'arthur',generation:1});expect(w.show).toHaveBeenCalledTimes(1);
});
it('does not show cancelled subscriptions and validates Carol independently',async()=>{
 const w=worker('carol',2),id=crypto.randomUUID();await w.push({id,recipient:'carol',generation:2});expect(w.show.mock.calls[0][1].data.url).toBe(`https://site.example/universo-dela/visao?stellar-letter=${id}`);
 w.state.enabled=false;await w.push({id:crypto.randomUUID(),recipient:'carol',generation:2});expect(w.show).toHaveBeenCalledTimes(1);
});
it('opens only the intended galaxy on notification click',async()=>{
 const w=worker();await w.click('https://site.example/universo-dela/visao?stellar-letter=id');expect(w.navigate).toHaveBeenCalledWith('https://site.example/universo-dela/visao?stellar-letter=id');await w.click('https://attacker.invalid');expect(w.navigate).toHaveBeenCalledTimes(1);
});
it('suppresses delivery safely when verification is unavailable',async()=>{
 const w=worker();w.fetch.mockRejectedValueOnce(Error('offline'));await w.push({id:crypto.randomUUID(),recipient:'arthur',generation:1});expect(w.show).not.toHaveBeenCalled();
});
