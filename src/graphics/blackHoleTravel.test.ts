import {expect,it} from 'vitest';
import {PerspectiveCamera,Quaternion,Vector3} from 'three';
import {sampleBlackHolePassage} from './blackHoleTravel';
it('enters and returns with the exact original endpoints and orientation',()=>{
 const camera=new PerspectiveCamera(),from=new Vector3(2,1,-3),to=new Vector3(5,0,8),a=new Quaternion(),b=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/2);
 sampleBlackHolePassage(camera,from,to,a,b,0);expect(camera.position.toArray()).toEqual(from.toArray());expect(camera.quaternion.equals(a)).toBe(true);
 sampleBlackHolePassage(camera,from,to,a,b,1);expect(camera.position.toArray()).toEqual(to.toArray());expect(camera.quaternion.equals(b)).toBe(true);
 sampleBlackHolePassage(camera,to,from,b,a,1);expect(camera.position.toArray()).toEqual(from.toArray());expect(camera.quaternion.angleTo(a)).toBeLessThan(.000001);
 sampleBlackHolePassage(camera,from,to,a,b,.5);expect(camera.position.toArray()).toEqual([3.5,.5,2.5]);expect(camera.quaternion.angleTo(a)).toBeCloseTo(Math.PI/4);
});
