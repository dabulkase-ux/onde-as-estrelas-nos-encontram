import {afterEach,expect,it,vi} from 'vitest';
import {blankHole,elementPosition,holesRepository,herBlackHolesKey} from './repository';
import {validateBlackHoles,validateDocument,publicPublication} from '../../../../supabase/functions/_shared/herUniverseDomain';
import {readyDocument,universeMock} from '../../../../tests/helpers/herUniverseMock';
import {localDocument,restoreLocalDocument} from '../remote/repository';
afterEach(()=>vi.unstubAllGlobals());
it('keeps legacy documents and independent blank elements without original personal texts',()=>{
 const legacy=readyDocument();expect(validateDocument(legacy)).toEqual(legacy);const a=blankHole([5,0,-2]),b=blankHole([-5,0,-2]);expect(a.id).not.toBe(b.id);expect(a.crystals).toHaveLength(5);expect(a.crystals.every(c=>c.title===''&&c.text==='')).toBe(true);expect(a.starLetter).toBeNull();a.crystals[0].text='Mensagem própria';a.starLetter={title:'Carta própria',paragraphs:['Conteúdo próprio']};expect(b.crystals[0].text).toBe('');const doc={...legacy,blackHoles:[a,b]};expect(validateDocument(doc)).toEqual(doc);expect(publicPublication('p','u',doc).blackHoles).toEqual([a,b]);
});
it('rejects corrupt crystals positions duplicate IDs and partial star letters',()=>{
 const a=blankHole([5,0,-2]);expect(()=>validateBlackHoles([a,a])).toThrow();expect(()=>validateBlackHoles([{...a,crystals:a.crystals.slice(1)}])).toThrow();expect(()=>validateBlackHoles([{...a,crystals:a.crystals.map(()=>a.crystals[0])}])).toThrow();for(const position of [[NaN,0,0],[Infinity,0,0],[0,0],[1001,0,0]])expect(()=>validateBlackHoles([{...a,position}])).toThrow();expect(()=>validateBlackHoles([{...a,starLetter:{title:'',paragraphs:['Mensagem']}}])).toThrow();
});
it('places many letters and holes apart without changing existing positions',()=>{
 const positions:{position:number[];radius:number}[]=[];for(let i=0;i<100;i++){const radius=i%2?2:.65,prior=JSON.stringify(positions),position=elementPosition(positions,radius,()=>.3);expect(JSON.stringify(positions)).toBe(prior);for(const e of positions)expect(Math.hypot(...position.map((v,i)=>v-e.position[i]))).toBeGreaterThan(radius+e.radius+.5);positions.push({position,radius});}
});
it('retains data on quota and corruption and restores all document fields with backup',()=>{
 const data=new Map<string,string>([['original-universe','preserved']]);vi.stubGlobal('window',{dispatchEvent:vi.fn()});vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)});const holes=[blankHole([5,0,-2]),blankHole([-5,0,-2])];expect(holesRepository.save(holes)).toBe('');const doc={...readyDocument(),letters:[],blackHoles:holes};restoreLocalDocument(doc);expect(localDocument()).toEqual(doc);expect(data.get('original-universe')).toBe('preserved');expect(JSON.parse(data.get('meu-universo.before-remote-import.v1')!).keys).toContain(herBlackHolesKey);vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:()=>{throw Error('quota');}});expect(holesRepository.save([])).not.toBe('');expect(holesRepository.load().holes).toEqual(holes);data.set(herBlackHolesKey,'broken');expect(holesRepository.load().error).not.toBe('');expect(data.get(herBlackHolesKey)).toBe('broken');
});
it('round trips independent contents through an isolated publication handler',async()=>{
 const holes=[blankHole([5,0,-2]),blankHole([-5,0,-2])];holes[0].crystals[0].title='Primeiro';holes[1].starLetter={title:'Estrela dois',paragraphs:['Só desta estrela.']};const doc={...readyDocument(),blackHoles:holes};const mock=universeMock();expect((await mock.request({action:'publish',revision:0,document:doc})).status).toBe(200);expect((await (await mock.request({action:'public'})).json()).publication.blackHoles).toEqual(holes);expect(mock.universe?.document.compatibility).toEqual(doc.compatibility);expect((await (await mock.request({action:'owner'})).json()).capabilities.blackHoles).toBe(true);
});
