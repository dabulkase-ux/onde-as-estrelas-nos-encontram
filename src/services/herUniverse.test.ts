import { describe, expect, it, afterEach, vi } from 'vitest';
import { publicPublication, validateDocument } from '../../supabase/functions/_shared/herUniverseDomain';
import { readyDocument, universeMock, universeId } from '../../tests/helpers/herUniverseMock';
import { localDocument, restoreLocalDocument } from '../experiences/herUniverse/remote/repository';
import { herUniverseKey } from '../experiences/herUniverse/progress';
import { herQuizKey } from '../experiences/herCompatibility/repository';
import { herCoupleKey } from '../experiences/herCouple/repository';
afterEach(()=>vi.unstubAllGlobals());
describe('universe server boundary and local migration',()=>{
  it('removes weights, correct flags, comments and unfinished quizzes from publication',()=>{
    const document=readyDocument();const visible=publicPublication('published',universeId,document);expect(JSON.stringify(visible)).not.toMatch(/weight|correct|comment/);document.couple.status='draft';expect(publicPublication('published',universeId,document).couple).toBeNull();
  });
  it('validates colors, quiz structure, weights, correct flags and completion server-side',()=>{
    for(const change of [(d:ReturnType<typeof readyDocument>)=>{d.galaxy.colors.push('azul');},(d:ReturnType<typeof readyDocument>)=>{d.compatibility.questions[0].options[0].weight=8;},(d:ReturnType<typeof readyDocument>)=>{d.couple.questions[0].options.forEach(o=>{o.correct=false;});},(d:ReturnType<typeof readyDocument>)=>{d.couple.questions[0].options.pop();}]){const d=readyDocument();change(d);expect(()=>validateDocument(d)).toThrow();}
  });
  it('publishes without Auth and exposes only publication metadata to creation recovery',async()=>{
    const mock=universeMock();const response=await mock.request({action:'publish',revision:0,document:readyDocument()});expect(response.status).toBe(200);
    const owner=await (await mock.request({action:'owner'})).json();expect(owner.universe.revision).toBe(1);expect(JSON.stringify(owner)).not.toMatch(/document|weight|correct|comment|owner_id/);
    expect((await mock.request({action:'publish',revision:1,document:readyDocument(),ownerId:universeId})).status).toBe(400);expect((await mock.request({action:'answer',result:100})).status).toBe(400);
  });
  it('does not store unfinished quiz drafts or expose them as published experiences',async()=>{
    const mock=universeMock(),doc=readyDocument();doc.couple.status='draft';await mock.request({action:'publish',revision:0,document:doc});expect(mock.universe?.document.couple.questions).toEqual([]);
    const pub=await (await mock.request({action:'public'})).json();expect(pub.publication.couple).toBeNull();expect(JSON.stringify(pub)).not.toMatch(/correct|weight|comment/);
  });
  it('protects published revisions and retries without duplicating publication or creating users',async()=>{
    const mock=universeMock();const doc=readyDocument();await mock.request({action:'publish',revision:0,document:doc});await mock.request({action:'publish',revision:0,document:doc});expect(mock.publications.size).toBe(1);
    doc.galaxy.colors=['azul'];expect((await mock.request({action:'publish',revision:0,document:doc})).status).toBe(409);expect((await mock.request({action:'publish',revision:1,document:doc})).status).toBe(200);
    expect((await mock.request({action:'save',revision:2,document:doc})).status).toBe(400);
  });
  it('only returns grading after a sequential answer, never trusts points',async()=>{
    const mock=universeMock();const pub=await (await mock.request({action:'publish',revision:0,document:readyDocument()})).json();
    const start=await (await mock.request({action:'start',publicationId:pub.publication.id,kind:'couple'})).json();expect(JSON.stringify(start)).not.toMatch(/correct|weight/);
    expect((await mock.request({action:'answer',attempt:start.attempt,index:4,optionId:'c4-2'})).status).toBe(409);
    const correction=await (await mock.request({action:'answer',attempt:start.attempt,index:0,optionId:'c0-4'})).json();expect(correction.correct).toBe(true);expect(correction.comment).toBe('Comentário 1');expect(correction.result).toBeUndefined();
  });
  it('handles network failure, rate limits and disallowed origins without leaking internals',async()=>{
    const mock=universeMock();mock.setNetworkError(true);const response=await mock.request({action:'public'});expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('Network');mock.setNetworkError(false);mock.setLimited(true);expect((await mock.request({action:'public'})).status).toBe(429);
    expect((await mock.handler(new Request('https://api.invalid',{method:'POST',headers:{Origin:'https://evil.invalid'},body:'{}'}))).status).toBe(403);
  });
  it('backs up local drafts before remote recovery and keeps correct flags/order',()=>{
    const data=new Map<string,string>([[herUniverseKey,'previous galaxy'],[herQuizKey,'previous quiz'],[herCoupleKey,'previous couple']]);vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)});
    const doc=readyDocument();restoreLocalDocument(doc);expect(JSON.parse(data.get('meu-universo.before-remote-import.v1')!).previous).toEqual(['previous galaxy','previous quiz','previous couple']);expect(localDocument()).toEqual(doc);
  });
  it('preserves all local data when backup storage fails',()=>{
    const data=new Map<string,string>([[herUniverseKey,'keep']]);vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:()=>{throw new Error('Quota');}});expect(()=>restoreLocalDocument(readyDocument())).toThrow();expect(data.get(herUniverseKey)).toBe('keep');
  });
});
