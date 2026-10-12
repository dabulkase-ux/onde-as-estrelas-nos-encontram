import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, PerspectiveCamera, Points, PointsMaterial, Scene, Sprite, SpriteMaterial, Texture, Vector3 } from 'three';
export type ShootingState = 'hidden'|'invited'|'held'|'delivered';
/** A single sprite and a 28-point reusable trail inside the existing scene. */
export class ShootingStar {
 readonly group = new Group();
 readonly head: Sprite;
 private material: SpriteMaterial;
 private trailMaterial: PointsMaterial;
 private geometry = new BufferGeometry();
 private buffer = new Float32Array(28*3);
 private local = new Vector3();
 private direction = new Vector3();
 private start = new Vector3();
 private state: ShootingState = 'hidden';
 private elapsed = 0;
 constructor(private scene:Scene, texture:Texture) {
  this.material=new SpriteMaterial({map:texture,color:'#f2d8a7',transparent:true,depthWrite:false,blending:AdditiveBlending});
  this.head=new Sprite(this.material);this.head.scale.setScalar(.38);
  this.trailMaterial=new PointsMaterial({map:texture,color:'#c6cfe5',size:.11,transparent:true,opacity:.6,depthWrite:false,blending:AdditiveBlending});
  this.geometry.setAttribute('position',new BufferAttribute(this.buffer,3));
  this.group.add(this.head,new Points(this.geometry,this.trailMaterial));this.group.visible=false;scene.add(this.group);
 }
 update(state:ShootingState,camera:PerspectiveCamera,dt:number,reduced:boolean) {
  if(state!==this.state){this.state=state;this.elapsed=0;if(state==='delivered'){this.start.copy(this.group.position);camera.getWorldDirection(this.direction);}}
  this.group.visible=state!=='hidden';if(!this.group.visible)return;
  this.elapsed+=dt;
  if(state==='invited') {
   const t=reduced?1:Math.min(1,this.elapsed/3800);const eased=1-(1-t)**3;
   const halfHeight=Math.tan(camera.fov*Math.PI/360)*8;const halfWidth=halfHeight*camera.aspect;
   this.local.set((- .55+.65*eased)*halfWidth,(.52-.15*eased)*halfHeight,-8);
   camera.updateMatrixWorld();this.group.position.copy(this.local).applyMatrix4(camera.matrixWorld);
   this.group.quaternion.copy(camera.quaternion);
  }
  if(state==='delivered') {
   const t=reduced?1:Math.min(1,this.elapsed/2400);this.group.position.copy(this.start).addScaledVector(this.direction,t*18);this.material.opacity=1-t;this.trailMaterial.opacity=(1-t)*.6;
  } else {this.material.opacity=1;this.trailMaterial.opacity=reduced?.22:.6;}
  for(let i=0;i<28;i++){const j=i*3;const fraction=i/27;this.buffer[j]=-fraction*(reduced?.35:1.7);this.buffer[j+1]=fraction*.24;this.buffer[j+2]=0;}
  this.geometry.attributes.position.needsUpdate=true;
 }
 dispose(){this.scene.remove(this.group);this.geometry.dispose();this.material.dispose();this.trailMaterial.dispose();}
}
