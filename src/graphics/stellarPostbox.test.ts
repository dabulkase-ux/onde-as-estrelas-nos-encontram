import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {StellarPostbox,type MailSceneInput} from './stellarPostbox';
afterEach(()=>vi.unstubAllGlobals());
it('pools a bounded arrival effect, does not replay its ID and respects reduced motion',()=>{
 vi.stubGlobal('window',{innerHeight:900});const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,120);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const state:MailSceneInput={visible:true,unread:1,arrival:'first',onOpen:vi.fn(),onProject:vi.fn()};const texture=new THREE.Texture(),box=new StellarPostbox(scene,texture,texture,()=>state);
 const canvas={getBoundingClientRect:()=>({left:0,top:0,width:900,height:900})} as HTMLCanvasElement;
 box.update(camera,canvas,100,false,0);const star=box.group.children.find(child=>child instanceof THREE.Sprite&&child!==box.marker.sprite)!;expect(star.visible).toBe(true);expect(box.group.children).toHaveLength(4);
 box.update(camera,canvas,4000,false,4000);expect(star.visible).toBe(false);box.update(camera,canvas,100,false,4100);expect(star.visible).toBe(false);
 state.arrival='second';box.update(camera,canvas,10,false,4200);expect(star.visible).toBe(true);box.update(camera,canvas,10,true,4300);expect(star.visible).toBe(false);expect(box.group.children.find(c=>c instanceof THREE.Points)?.visible).toBe(false);
 state.visible=false;box.update(camera,canvas,10,false,4400);expect(box.group.visible).toBe(false);box.dispose();expect(scene.children).toHaveLength(0);
});
