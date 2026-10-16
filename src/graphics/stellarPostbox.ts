import * as THREE from 'three';
import {createUniverseMarker} from './letterMarkers';
export type MailSceneInput={visible:boolean;unread:number;arrival:string;onOpen:()=>void;onProject:(point:{x:number;y:number;visible:boolean})=>void};
/** Original envelope texture, one reusable star/trail and a bounded particle burst. */
export class StellarPostbox{
 readonly group=new THREE.Group();readonly marker:ReturnType<typeof createUniverseMarker>;
 private ringGeometry=new THREE.TorusGeometry(.38,.012,5,40);
 private ringMaterial=new THREE.MeshBasicMaterial({color:'#d9c6f2',transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending});
 private ring=new THREE.Mesh(this.ringGeometry,this.ringMaterial);
 private starMaterial:THREE.SpriteMaterial;private star:THREE.Sprite;private geometry=new THREE.BufferGeometry();private positions=new Float32Array(52*3);private particles:THREE.Points;private particleMaterial:THREE.PointsMaterial;
 private elapsed=10000;private lastArrival='';private from=new THREE.Vector3();private point=new THREE.Vector3();
 constructor(private scene:THREE.Scene,texture:THREE.Texture,envelope:THREE.Texture,private get:()=>MailSceneInput|undefined){
  this.marker=createUniverseMarker({id:'stellar-mail',type:'letter',position:[-3,1.2,0],scale:5,label:'Correio Estelar',interactive:true,onSelect:()=>get()?.onOpen()},texture,envelope);
  this.group.add(this.marker.sprite,this.ring);this.ring.position.copy(this.marker.sprite.position);this.group.visible=false;
  this.starMaterial=new THREE.SpriteMaterial({map:texture,color:'#f2d8a7',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});this.star=new THREE.Sprite(this.starMaterial);this.star.scale.setScalar(.23);
  this.particleMaterial=new THREE.PointsMaterial({map:texture,color:'#d9c6f2',size:.055,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.particles=new THREE.Points(this.geometry,this.particleMaterial);this.group.add(this.star,this.particles);scene.add(this.group);
 }
 update(camera:THREE.PerspectiveCamera,canvas:HTMLCanvasElement,dt:number,reduced:boolean,now:number){
  const state=this.get();this.group.visible=Boolean(state?.visible);if(!state||!state.visible)return;
  this.marker.sprite.lookAt(camera.position);this.ring.quaternion.copy(camera.quaternion);this.marker.sprite.material.opacity=state.unread?.95:.7;this.ringMaterial.opacity=state.unread?.55+(reduced?0:Math.sin(now*.0018)*.12):.25;
  if(state.arrival&&state.arrival!==this.lastArrival){this.lastArrival=state.arrival;this.elapsed=0;camera.updateMatrixWorld();this.from.set(-5,3,-7).applyMatrix4(camera.matrixWorld);}
  this.elapsed+=dt;const t=reduced?1:Math.min(1,this.elapsed/2400),burst=Math.max(0,(this.elapsed-2400)/900),destination=this.marker.sprite.position;
  this.star.visible=!reduced&&t<1;this.particles.visible=!reduced&&this.elapsed<3300;
  this.star.position.lerpVectors(this.from,destination,1-(1-t)**2);this.starMaterial.opacity=1-t*.3;
  for(let i=0;i<52;i++){const fraction=i/51;if(t<1){this.point.lerpVectors(this.from,destination,Math.max(0,1-(1-t)**2-fraction*.16));}else{const angle=i*2.39996;this.point.copy(destination);this.point.x+=Math.cos(angle)*burst*.7;this.point.y+=Math.sin(angle)*burst*.7;this.point.z+=Math.sin(i)*burst*.3;}this.positions[i*3]=this.point.x;this.positions[i*3+1]=this.point.y;this.positions[i*3+2]=this.point.z;}
  this.geometry.attributes.position.needsUpdate=true;this.particleMaterial.opacity=t<1?.55:Math.max(0,1-burst)*.6;
  this.point.copy(destination).project(camera);const rect=canvas.getBoundingClientRect();const x=rect.left+(this.point.x+1)*rect.width/2,y=rect.top+(1-this.point.y)*rect.height/2;state.onProject({x,y,visible:this.point.z>-1&&this.point.z<1&&x>28&&x<rect.width-28&&y>90&&y<window.innerHeight-170});
 }
 dispose(){this.scene.remove(this.group);this.marker.sprite.material.dispose();this.ringGeometry.dispose();this.ringMaterial.dispose();this.starMaterial.dispose();this.geometry.dispose();this.particleMaterial.dispose();}
}
