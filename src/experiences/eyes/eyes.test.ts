import { beforeEach, expect, it, vi } from 'vitest';
import { Scene, PerspectiveCamera } from 'three';
import { EyesEncounter, eyesUnlocked, eyesWatched, eyesStarted, isEyesFinishOverride, saveEyesStarted, eyesStorageKey, saveEyesWatched, eyesPhrase } from './progress';
import { letterIds } from '../letters/data';
import { blackHoleFragments } from '../blackHole/data';
import { eyePaths, EyesConstellation } from '../../graphics/eyesConstellation';
import { eyeChains, eyeStars } from '../../graphics/eyesReference';
const hole={discovered:blackHoleFragments.map(f=>f.id),starFormed:true};
beforeEach(()=>{const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key),setItem:(key:string,value:string)=>values.set(key,value)});});
it('requires all six letters, both completed quizzes and all fragments with their star',()=>{
  expect(eyesUnlocked([...letterIds],true,true,hole)).toBe(true);
  expect(eyesUnlocked([...letterIds].slice(1),true,true,hole)).toBe(false);
  expect(eyesUnlocked([...letterIds],false,true,hole)).toBe(false);
  expect(eyesUnlocked([...letterIds],true,false,hole)).toBe(false);
  expect(eyesUnlocked([...letterIds],true,true,{...hole,starFormed:false})).toBe(false);
  expect(eyesUnlocked([...letterIds],true,true,{...hole,discovered:hole.discovered.slice(1)})).toBe(false);
});
it('recognizes only the explicit finish URL parameter',()=>{
  expect(isEyesFinishOverride('?finish=1')).toBe(true);
  expect(isEyesFinishOverride('?other=1&finish=1')).toBe(true);
  expect(isEyesFinishOverride('')).toBe(false);
  expect(isEyesFinishOverride('?finish=0')).toBe(false);
  expect(isEyesFinishOverride('?finish=true')).toBe(false);
});
it('persists only a versioned watched marker, tolerating blocked storage',()=>{
  expect(eyesWatched()).toBe(false);expect(saveEyesWatched()).toBe(true);expect(eyesWatched()).toBe(true);
  expect(JSON.parse(localStorage.getItem(eyesStorageKey)!)).toEqual({version:1,started:true,watched:true});
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});
  expect(eyesWatched()).toBe(false);expect(saveEyesWatched()).toBe(false);
});
it('counts only active idle exploration and resets when another experience opens',()=>{
  const clock=new EyesEncounter();for(let i=0;i<20;i++)expect(clock.tick(1000,true,false)).toBe(false);
  for(let i=0;i<11;i++)expect(clock.tick(1000,true,true)).toBe(false);
  expect(clock.tick(1000,false,true)).toBe(false);expect(clock.elapsed).toBe(0);
  for(let i=0;i<11;i++)clock.tick(1000,true,true);
  expect(clock.tick(1000,true,true)).toBe(true);
});
it('remembers an interrupted first run without falsely marking it watched',()=>{
  expect(eyesStarted()).toBe(false);expect(saveEyesStarted()).toBe(true);
  expect(eyesStarted()).toBe(true);expect(eyesWatched()).toBe(false);
  saveEyesWatched();saveEyesStarted();expect(eyesWatched()).toBe(true);
});
it('maps asymmetric lids, brows and linked stars from the reference rather than iris circles',()=>{
  const paths=eyePaths();expect(paths).toHaveLength(eyeChains.length);
  expect(paths[0].every(point=>point.x<0)).toBe(true);expect(paths[2].every(point=>point.x>0)).toBe(true);
  expect(eyeStars.find(star=>star.id==='l-fold-0')?.x).toBe(252/1600);
  expect(eyeStars.find(star=>star.id==='r-outer')?.y).toBe(405/800);
  expect(new Set(eyeStars.map(star=>star.size)).size).toBeGreaterThan(5);
  expect(eyeChains.some(chain=>chain.id.includes('brow'))).toBe(true);
  for(const chain of eyeChains)for(const id of chain.stars)expect(eyeStars.some(star=>star.id===id)).toBe(true);
  const scene=new Scene(),eyes=new EyesConstellation(scene);
  const links=eyes.group.getObjectByName('eye-connections') as import('three').LineSegments;
  const stars=eyes.group.getObjectByName('eye-landmarks') as import('three').Points;
  const iris=eyes.group.getObjectByName('left-dark-iris') as import('three').Mesh;
  eyes.form(0,false);expect(links.geometry.drawRange.count).toBe(0);expect(stars.geometry.drawRange.count).toBe(0);
  expect((iris.material as import('three').MeshBasicMaterial).opacity).toBe(0);
  eyes.form(.3,false);expect(links.geometry.drawRange.count).toBe(0);
  expect(stars.geometry.attributes.aDrift.array.some(value=>value!==0)).toBe(true);
  eyes.form(.65,false);expect(links.geometry.attributes.aAlpha.array.some(value=>value>0)).toBe(true);
  expect(links.geometry.attributes.aAlpha.array.some(value=>value===0)).toBe(true);
  eyes.form(1,true);expect(links.geometry.attributes.aAlpha.array.every(value=>value>0)).toBe(true);
  expect(stars.geometry.drawRange.count).toBe(stars.geometry.attributes.position.count);
  eyes.dispose();expect(scene.children).toHaveLength(0);
});
it.each([true,false])('forms, waits indefinitely, and restores the exact camera including early exit (reduced=%s)',reduced=>{
  const camera=new PerspectiveCamera(45,.4,.1,120);camera.position.set(2,3,14);camera.rotation.set(.1,.2,.3);
  const position=camera.position.clone(),orientation=camera.quaternion.clone();const eyes=new EyesConstellation(new Scene());eyes.begin(camera);
  let ready=0;for(let i=0;i<700;i++)if(eyes.update(camera,50,reduced,true,false,false).ready)ready++;
  expect(ready).toBe(1);eyes.return(camera);for(let i=0;i<100;i++)eyes.update(camera,50,reduced,true,true,false);
  expect(camera.position.equals(position)).toBe(true);expect(camera.quaternion.equals(orientation)).toBe(true);
  eyes.begin(camera);eyes.update(camera,50,reduced,true,true,false);const start=camera.position.clone();eyes.return(camera);
  eyes.update(camera,0,reduced,true,true,false);expect(camera.position.equals(start)).toBe(true);eyes.dispose();
});
it('preserves the approved sentence verbatim',()=>{expect(eyesPhrase).toBe('Depois de tudo isso… será que você conseguiria olhar pra mim de um jeito diferente?');});
