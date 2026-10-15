import type {PerspectiveCamera,Quaternion,Vector3} from 'three';
/** Original interior transition, shared unchanged by both universes. */
export function sampleBlackHolePassage(camera:PerspectiveCamera,from:Vector3,to:Vector3,fromOrientation:Quaternion,toOrientation:Quaternion,progress:number){
 const eased=progress*progress*(3-2*progress);
 camera.position.lerpVectors(from,to,eased);
 camera.quaternion.slerpQuaternions(fromOrientation,toOrientation,eased);
}
