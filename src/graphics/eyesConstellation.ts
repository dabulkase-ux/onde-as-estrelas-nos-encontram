import * as T from 'three';
import { EyesArtwork } from './eyesArtwork';
export { eyePaths } from './eyesArtwork';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export class EyesConstellation extends EyesArtwork {
  readonly center=new T.Vector3(0,5,-24);
  private from = new T.Vector3();
  private fromQ = new T.Quaternion();
  private to = new T.Vector3();
  private toQ = new T.Quaternion();
  private matrix = new T.Matrix4();
  private tilt = new T.Quaternion();
  private horizontal = new T.Vector3(1,0,0);
  private time = 0;
  private returnTime = 0;
  private hintTime = 0;
  private ready = false;
  private returning = false;
  private returnFrom = new T.Vector3();
  private returnQ = new T.Quaternion();
  private returnDim = .07;


  constructor(scene:T.Scene){super(scene);this.group.position.copy(this.center);}
  begin(camera: T.PerspectiveCamera) {
    this.from.copy(camera.position); this.fromQ.copy(camera.quaternion);
    this.time=0;this.ready=false;this.returning=false;this.group.scale.setScalar(1);this.group.position.copy(this.center);
  }

  return(camera:T.PerspectiveCamera) { if (!this.returning) { this.returning=true; this.returnTime=0;this.returnFrom.copy(camera.position);this.returnQ.copy(camera.quaternion);this.returnDim=1-.93*smooth(this.time/1800); } }
  get formed(){return this.ready;}
  private destination(camera: T.PerspectiveCamera,screenTilt:number) {
    const distance = Math.max(8, 3.2 / (Math.tan(T.MathUtils.degToRad(camera.fov/2)) * camera.aspect));
    this.to.copy(this.center); this.to.z += distance;
    this.matrix.lookAt(this.to,this.center,camera.up);this.toQ.setFromRotationMatrix(this.matrix).multiply(this.tilt.setFromAxisAngle(this.horizontal,screenTilt));
  }

  update(camera:T.PerspectiveCamera, delta:number, reduced:boolean, active:boolean, watched:boolean, hint:boolean,screenTilt=0) {
    this.group.visible=active||watched||hint;
    if (!this.group.visible) return {ready:false,returned:false,dim:1};
    if (!active) {
      this.hintTime=hint?this.hintTime+Math.min(delta,50):0;
      this.group.scale.setScalar(hint?1:.13);
      if(hint)this.group.position.copy(this.center);else this.group.position.set(3.8,3,-3);
      this.form(watched?1:.05+.035*clamp(this.hintTime/5000),true); return {ready:false,returned:false,dim:1};
    }
    this.destination(camera,screenTilt);this.time+=Math.min(delta,50);
    const approach=reduced?2500:6500, duration=reduced?3200:18000;
    const travel=smooth(this.time/approach);
    if(this.returning) {
      this.returnTime+=Math.min(delta,50);
      const p=smooth(this.returnTime/(reduced?650:4200));
      camera.position.lerpVectors(this.returnFrom,this.from,p);camera.quaternion.slerpQuaternions(this.returnQ,this.fromQ,p);
      if(p===1){camera.position.copy(this.from);camera.quaternion.copy(this.fromQ);}
      return {ready:false,returned:p===1,dim:this.returnDim+(1-this.returnDim)*p};
    }
    camera.position.lerpVectors(this.from,this.to,travel);camera.quaternion.slerpQuaternions(this.fromQ,this.toQ,travel);
    this.form(clamp(this.time/duration),reduced);
    const ready=this.time>=duration+(reduced?400:1800);
    const firstReady=ready&&!this.ready;this.ready ||= ready;
    return {ready:firstReady,returned:false,dim:1-.93*smooth(this.time/1800)};
  }
}
