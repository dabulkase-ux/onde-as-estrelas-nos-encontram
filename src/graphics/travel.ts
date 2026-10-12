import type { LetterId } from '../experiences/letters/data';
import { CatmullRomCurve3, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';

export type Destination = 'eyes' | 'compatibility' | 'couple' | 'wish' | 'garden' | 'black-hole' | LetterId;
export type NavigationPhase = 'EYES_ACTIVE' | 'GALAXY_IDLE' | 'TRAVEL_TO_DESTINATION' | 'PORTAL_INVITATION' | 'PORTAL_ENTRY' | 'GARDEN_ACTIVE' | 'BLACK_HOLE_ENTRY' | 'BLACK_HOLE_ACTIVE' | 'QUIZ_ACTIVE' | 'LETTER_ACTIVE' | 'WISH_ACTIVE' | 'RETURN_TO_GALAXY';
export interface Navigation { phase: NavigationPhase; destination: Destination; skip: boolean; gardenEntered: boolean; blackHoleEntered?: boolean; }

/** One reusable route, sampled in reverse on return. FOV and scene stay untouched. */
export class CameraTravel {
  readonly position = new Vector3();
  readonly orientation = new Quaternion();
  readonly destination = new Vector3();
  private route = new CatmullRomCurve3();
  private endOrientation = new Quaternion();
  private target = new Vector3();
  private matrix = new Matrix4();
  private origin = new Vector3();
  private up = new Vector3(0, 1, 0);
  private screenTilt = 0;
  private tilt = new Quaternion();
  private horizontal = new Vector3(1, 0, 0);
  prepare(camera: PerspectiveCamera, star: Vector3, side: number, screenTilt = 0, gentle = false, approachDirection?: Vector3) {
    this.position.copy(camera.position);
    this.orientation.copy(camera.quaternion);
    this.destination.copy(star);
    this.screenTilt = screenTilt;
    const outward = approachDirection
      ? approachDirection.clone().normalize()
      : gentle ? camera.position.clone().sub(star).normalize() : camera.position.clone().normalize();
    const wide = gentle ? camera.position.clone().addScaledVector(outward,.6) : camera.position.clone().multiplyScalar(1.38);
    const bend = wide.clone().lerp(star, .55).add(new Vector3(side * 3, 3, -2));
    const approach = star.clone().addScaledVector(outward, 4);
    const end = star.clone().addScaledVector(outward, gentle ? 2.8 : .65);
    this.route = new CatmullRomCurve3([this.position.clone(), wide, bend, approach, end], false, 'centripetal');
    this.matrix.lookAt(end, star, this.up);
    this.endOrientation.setFromRotationMatrix(this.matrix);
    this.tilt.setFromAxisAngle(this.horizontal, screenTilt);
    this.endOrientation.multiply(this.tilt);
  }
  sample(camera: PerspectiveCamera, progress: number) {
    const t = Math.max(0, Math.min(1, progress));
    const eased = t * t * (3 - 2 * t);
    this.route.getPoint(eased, camera.position);
    this.target.copy(this.origin).lerp(this.destination, Math.min(1, eased * 2));
    this.matrix.lookAt(camera.position, this.target, this.up);
    camera.quaternion.setFromRotationMatrix(this.matrix);
    if (t < .15) camera.quaternion.slerp(this.orientation, (1 - t / .15) ** 2);
    const alignment = Math.max(0, Math.min(1, (t - .3) / .55));
    camera.rotateX(this.screenTilt * alignment * alignment * (3 - 2 * alignment));
    if (t === 0) { camera.position.copy(this.position); camera.quaternion.copy(this.orientation); }
    if (t === 1) camera.quaternion.copy(this.endOrientation);
  }
}
