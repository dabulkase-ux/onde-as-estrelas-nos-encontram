import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {createHerBlackHoles,type HerElementsInput} from './herBlackHoles';
import {blankHole} from '../experiences/herUniverse/elements/repository';

vi.mock('./blackHoleScene',()=>({createBlackHoleScene:(scene:THREE.Scene,position:THREE.Vector3)=>{
 const portal=new THREE.Group(),interior=new THREE.Group();portal.position.copy(position);scene.add(portal,interior);
 return {portal,interior,hitArea:new THREE.Mesh(),accretion:new THREE.Group(),dust:new THREE.Group(),dispose:vi.fn(),select:vi.fn(),animate:vi.fn(),project:()=>[]};
}}));
afterEach(()=>vi.unstubAllGlobals());
it('removes personalized scenes on departure and permits a fresh journey when returning',()=>{
 vi.stubGlobal('window',{innerHeight:900});
 const original=new THREE.Group(),scene=new THREE.Scene();scene.add(original);
 const camera=new THREE.PerspectiveCamera(45,1,0.1,120);camera.position.set(0,0,10);
 const hole=blankHole([5,0,-2]),completed=vi.fn();
 const input:HerElementsInput={holes:[hole],journey:{id:hole.id,position:hole.position,phase:'outward'},discovered:[],formed:false,selected:null,onOpen:vi.fn(),onComplete:completed,onSelect:vi.fn(),onFormed:vi.fn(),onProject:vi.fn(),onCrystals:vi.fn()};
 const canvas={getBoundingClientRect:()=>({left:0,top:0,width:900,height:900})} as HTMLCanvasElement;
 const controller=createHerBlackHoles(scene,canvas,camera,()=>input);
 controller.update(4000,4000,true);expect(completed).toHaveBeenCalledTimes(1);expect(scene.children).toHaveLength(3);
 controller.dispose();expect(scene.children).toEqual([original]);expect(controller.hitAreas).toEqual([]);
 controller.update(8000,4000,true);expect(scene.children).toHaveLength(3);expect(completed).toHaveBeenCalledTimes(2);
 controller.dispose();expect(scene.children).toEqual([original]);
});
