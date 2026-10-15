import {sampleBlackHolePassage} from './blackHoleTravel';
import * as THREE from 'three';
import {createBlackHoleScene,type BlackHoleProjection} from './blackHoleScene';
import {CameraTravel} from './travel';
import type {HerBlackHole,CrystalId} from '../../supabase/functions/_shared/herUniverseDomain';
export type HoleJourney={id:string;position:[number,number,number];phase:'outward'|'entry'|'active'|'returning';skip?:boolean};
export type HerElementsInput={holes:readonly HerBlackHole[];journey:HoleJourney|null;discovered:readonly CrystalId[];formed:boolean;selected:CrystalId|null;onOpen:(id:string)=>void;onComplete:()=>void;onSelect:(id:CrystalId)=>void;onFormed:()=>void;onProject:(points:readonly {id:string;x:number;y:number;visible:boolean}[])=>void;onCrystals:(points:readonly BlackHoleProjection[])=>void};
/** Each instance is the original scene factory; only its position and state differ. */
export function createHerBlackHoles(scene:THREE.Scene,canvas:HTMLCanvasElement,camera:THREE.PerspectiveCamera,get:()=>HerElementsInput|undefined){
 const entries=new Map<string,{scene:ReturnType<typeof createBlackHoleScene>;proxy:THREE.Sprite}>(),travel=new CameraTravel();
 let phase='',elapsed=0,finished=false;
 const arrival=new THREE.Vector3(),arrivalQ=new THREE.Quaternion(),inside=new THREE.Vector3(),insideQ=new THREE.Quaternion(),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 const remove=(id:string)=>{const entry=entries.get(id)!;scene.remove(entry.scene.portal,entry.scene.interior);entry.scene.dispose();entry.proxy.material.dispose();entries.delete(id);};
 return {
  get hitAreas(){const input=get();return input&&!input.journey?[...entries.values()].map(e=>e.scene.hitArea):[];},
  select(event:PointerEvent){const input=get(),entry=input?.journey&&entries.get(input.journey.id);if(entry&&input?.journey?.phase==='active'&&!input.selected)entry.scene.select(event,canvas,camera,input.onSelect);},
  update(now:number,delta:number,reduced:boolean){
   const input=get();if(!input)return {opacity:1,hideGalaxy:false};
   const far=input.holes.reduce((distance,hole)=>Math.max(distance,Math.hypot(...hole.position)+40),120);
   if(camera.far!==far){camera.far=far;camera.updateProjectionMatrix();}
   for(const hole of input.holes)if(!entries.has(hole.id)){
    const own=createBlackHoleScene(scene,new THREE.Vector3(...hole.position));own.interior.visible=false;
    const proxy=new THREE.Sprite();proxy.userData={object:{interactive:true,onSelect:()=>get()?.onOpen(hole.id)}};own.hitArea.userData.herProxy=proxy;entries.set(hole.id,{scene:own,proxy});
   }
   for(const id of entries.keys())if(!input.holes.some(h=>h.id===id)&&input.journey?.id!==id)remove(id);
   const j=input.journey,entry=j?entries.get(j.id):null,quick=reduced||Boolean(j?.skip);
   for(const [id,e] of entries){e.scene.portal.visible=!j||j.id===id&&j.phase!=='active';e.scene.interior.visible=false;e.scene.portal.rotation.y=reduced?0:Math.sin(now*.00018)*.06;e.scene.accretion.rotation.y+=reduced?0:delta*.00012;e.scene.dust.rotation.y-=reduced?0:delta*.00008;}
   let opacity=1,hideGalaxy=false;
   if(j&&entry){
    if(phase!==`${j.id}:${j.phase}`){phase=`${j.id}:${j.phase}`;elapsed=0;finished=false;
     if(j.phase==='outward'){const rect=canvas.getBoundingClientRect(),centerY=1-2*(window.innerHeight/2-rect.top)/rect.height;travel.prepare(camera,entry.scene.portal.position,1,-Math.atan(centerY*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))));}
     if(j.phase==='entry'){arrival.copy(camera.position);arrivalQ.copy(camera.quaternion);inside.copy(entry.scene.portal.position).add(new THREE.Vector3(0,0,10));matrix.lookAt(inside,entry.scene.portal.position,new THREE.Vector3(0,1,0));insideQ.setFromRotationMatrix(matrix);}
    }
    elapsed+=delta;
    if(j.phase==='outward'){const p=quick?1:Math.min(1,elapsed/3800);travel.sample(camera,p);if(p===1&&!finished){finished=true;input.onComplete();}}
    if(j.phase==='entry'){const p=quick?1:Math.min(1,elapsed/1800);sampleBlackHolePassage(camera,arrival,inside,arrivalQ,insideQ,p);entry.scene.portal.visible=p<.58;entry.scene.interior.visible=p>.45;opacity=1-p;if(p===1&&!finished){finished=true;input.onComplete();}}
    if(j.phase==='active'){camera.position.copy(inside);camera.quaternion.copy(insideQ);entry.scene.portal.visible=false;entry.scene.interior.visible=true;hideGalaxy=true;opacity=0;entry.scene.animate(now,delta,reduced,input.discovered,input.formed,input.onFormed);const rect=canvas.getBoundingClientRect();input.onCrystals(entry.scene.project(rect.width,rect.height,camera).map(p=>({...p,x:p.x+rect.left,y:p.y+rect.top})));}
    if(j.phase==='returning'){if(quick){travel.sample(camera,0);}else if(elapsed<1800){const p=elapsed/1800;sampleBlackHolePassage(camera,inside,arrival,insideQ,arrivalQ,p);}else travel.sample(camera,1-Math.min(1,(elapsed-1800)/3800));if((quick||elapsed>=5600)&&!finished){finished=true;input.onComplete();}}
   }else phase='';
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
   const rect=canvas.getBoundingClientRect();input.onProject(input.holes.map(h=>{point.set(...h.position).project(camera);const x=rect.left+(point.x+1)*rect.width/2,y=rect.top+(1-point.y)*rect.height/2;return {id:h.id,x,y,visible:!j&&point.z>-1&&point.z<1&&x>30&&x<rect.width-30&&y>90&&y<window.innerHeight-100};}));
   return {opacity,hideGalaxy};
  },
  dispose(){for(const id of entries.keys())remove(id);phase='';elapsed=0;finished=false;},
 };
}
