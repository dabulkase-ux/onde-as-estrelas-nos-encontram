import * as THREE from 'three';
import type { UniverseObject } from './universeObjects';
export type LetterJourney={id:string;position:[number,number,number];phase:'outward'|'reading'|'returning';skip?:boolean};
export function createUniverseMarker(entry:UniverseObject,texture:THREE.Texture,envelopeTexture:THREE.Texture){
 const spriteMaterial=new THREE.SpriteMaterial({color:entry.id==='compatibility'?'#89caff':entry.id==='couple'?'#ffe0a2':entry.id==='black-hole'?'#9294ff':'#ffffff',map:entry.type==='letter'?envelopeTexture:texture,transparent:true,opacity:entry.id==='black-hole'?0:entry.type==='letter'?.78:.42,depthWrite:false,blending:entry.type==='letter'?THREE.NormalBlending:THREE.AdditiveBlending});
 const sprite=new THREE.Sprite(spriteMaterial);sprite.position.set(...entry.position);sprite.scale.setScalar((entry.scale??1)*.12);sprite.userData={id:entry.id,object:entry};
 return {sprite,object:entry,baseScale:entry.scale??1,baseY:sprite.position.y};
}
export function animateUniverseMarker(marker:ReturnType<typeof createUniverseMarker>,camera:THREE.Camera,hovered:THREE.Sprite|null,reduced:boolean,elapsed:number,read:boolean,envelopeTexture:THREE.Texture,readEnvelopeTexture:THREE.Texture,destination:boolean,travelPosition:THREE.Vector3){
 marker.sprite.lookAt(camera.position);const envelope=marker.object.type==='letter';
 if(envelope)marker.sprite.material.map=read?readEnvelopeTexture:envelopeTexture;
 if(destination){marker.sprite.position.copy(travelPosition);const proximity=1-THREE.MathUtils.smoothstep(marker.sprite.position.distanceTo(camera.position),.65,4);marker.sprite.material.opacity=.42+proximity*.58;marker.sprite.scale.setScalar(marker.baseScale*(.12+proximity*.32));}
 else{marker.sprite.material.opacity=marker.sprite===hovered?envelope?.92:.82:envelope?.7+Number(!reduced)*Math.sin(elapsed*.7+marker.baseY)*.06:.42;marker.sprite.scale.setScalar(marker.baseScale*(marker.sprite===hovered?.17:.12));marker.sprite.position.y=marker.baseY+Math.sin(elapsed*.12+marker.object.position[0])*.012;}
}
