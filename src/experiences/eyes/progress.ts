import { readLetters } from '../letters/progress';
import { lostLetters } from '../letters/data';
import { readProgress } from '../compatibility/logic';
import { readCoupleProgress } from '../couple/logic';
import { readBlackHoleProgress } from '../blackHole/progress';
import { blackHoleFragments } from '../blackHole/data';

export const eyesStorageKey = 'meu-universo.eyes-constellation.v1';
export const eyesPhrase = 'Depois de tudo isso… será que você conseguiria olhar pra mim de um jeito diferente?';
export function isEyesFinishOverride(search: string) {
  return new URLSearchParams(search).get('finish') === '1';
}
export function eyesUnlocked(letters = readLetters(), compatibility = readProgress().completed,
  couple = readCoupleProgress().completed, blackHole = readBlackHoleProgress()) {
  return lostLetters.every(letter => letters.includes(letter.id)) && compatibility && couple &&
    blackHole.starFormed && blackHoleFragments.every(fragment => blackHole.discovered.includes(fragment.id));
}
export function eyesWatched() {
  try { const value = JSON.parse(localStorage.getItem(eyesStorageKey) ?? 'null'); return value?.version === 1 && value?.watched === true; }
  catch { return false; }
}
export function eyesStarted() {
  try {const value=JSON.parse(localStorage.getItem(eyesStorageKey)??'null');return value?.version===1&&(value.started===true||value.watched===true);}catch{return false;}
}
export function saveEyesStarted() {
  try {localStorage.setItem(eyesStorageKey,JSON.stringify({version:1,started:true,watched:eyesWatched()}));return true;}catch{return false;}
}
export function saveEyesWatched() {
  try { localStorage.setItem(eyesStorageKey, JSON.stringify({ version: 1, started: true, watched: true })); return true; }
  catch { return false; }
}
/** Only foreground, recent navigation counts; another experience resets the interval. */
export class EyesEncounter {
  elapsed = 0;
  tick(delta: number, eligible: boolean, active: boolean) {
    if (!eligible) { this.elapsed = 0; return false; }
    if (active) this.elapsed += Math.min(delta, 1000);
    return this.elapsed >= 12000;
  }
}
