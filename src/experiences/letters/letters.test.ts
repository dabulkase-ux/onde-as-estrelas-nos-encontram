import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLetterId, letterIds, lostLetters } from './data';
import { letterStorageKey, readLetters, saveLetters } from './progress';
import { universeObjects } from '../../graphics/universeObjects';
import { universeFlowerClusters, universeHeartConfig, universeTextEntries } from '../../config/universeContent';
afterEach(() => vi.unstubAllGlobals());
describe('lost letters', () => {
  it('preserves the six titles, paragraph boundaries, order and punctuation without emoji', () => {
    expect(lostLetters.map(letter => letter.title)).toEqual(['A carta que eu nunca enviei','Um pequeno defeito meu','Seus olhos','Cinco minutos a mais','Se o futuro me permitir','Se você encontrou esta carta...']);
    expect(lostLetters.map(letter => letter.paragraphs.length)).toEqual([8,8,9,8,9,12]);
    expect(lostLetters.map(letter => letter.id)).toEqual(letterIds);
    for (const letter of lostLetters) {
      expect(JSON.stringify(letter)).not.toMatch(/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u2661|\uFE0F|\u20E3)/u);
      expect(letter.paragraphs.every(p => p.length > 0 && !p.includes('\n'))).toBe(true);
    }
    expect(lostLetters[4].paragraphs[5]).toBe('Você.');
    expect(lostLetters[5].paragraphs[1]).toContain('"fazer algo simples"');
    expect(lostLetters[5].paragraphs[9]).toBe('O motivo sempre foi você.');
  });
  it('registers separate spatial destinations away from existing romantic objects', () => {
    const protectedPositions = [...universeObjects.filter(object => object.type !== 'letter').map(object => object.position), ...universeTextEntries.map(entry => entry.position), ...universeFlowerClusters.map(entry => entry.center), universeHeartConfig.center];
    for (const letter of lostLetters) {
      expect(universeObjects.find(object => object.id === letter.id)).toMatchObject({type:'letter',interactive:true,position:letter.position});
      for (const position of protectedPositions) expect(Math.hypot(...letter.position.map((coordinate,i) => coordinate-position[i]))).toBeGreaterThan(1);
    }
  });
  it('stores arbitrary discovery order independently and deduplicates known IDs', () => {
    const values = new Map([['meu-universo.couple.v1','preserved'],['meu-universo.compatibility.v1','preserved']]);
    vi.stubGlobal('localStorage', {getItem:(key:string)=>values.get(key),setItem:(key:string,value:string)=>values.set(key,value)});
    expect(saveLetters(['letter-6','letter-2','letter-1'])).toBe(true);
    expect(readLetters()).toEqual(['letter-6','letter-2','letter-1']);
    expect(JSON.parse(values.get(letterStorageKey)!)).toEqual({version:1,read:['letter-6','letter-2','letter-1']});
    expect(values.get('meu-universo.couple.v1')).toBe('preserved'); expect(values.get('meu-universo.compatibility.v1')).toBe('preserved');
    values.set(letterStorageKey,JSON.stringify({version:1,read:['letter-3','bad',null,'letter-3']})); expect(readLetters()).toEqual(['letter-3']);
    expect(isLetterId('couple')).toBe(false);
  });
  it('tolerates unavailable, corrupt or unknown-version storage', () => {
    for (const value of ['{','null','[]','{"version":2,"read":["letter-1"]}','{"version":1,"read":false}']) {
      vi.stubGlobal('localStorage',{getItem:()=>value}); expect(readLetters()).toEqual([]);
    }
    vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});
    expect(readLetters()).toEqual([]); expect(saveLetters(['letter-1'])).toBe(false);
  });
});
