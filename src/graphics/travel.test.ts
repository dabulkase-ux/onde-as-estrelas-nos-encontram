import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CameraTravel } from './travel';

describe('camera travel', () => {
  it('centers the destination inside a viewport shorter than the existing canvas', () => {
    const camera = new PerspectiveCamera(45, 844 / 680);
    camera.position.set(-9, 4, 7); camera.lookAt(0, 0, 0);
    const original = camera.quaternion.clone();
    const star = new Vector3(0, 2.7, 2);
    const expectedY = 1 - 390 / 680;
    const angle = -Math.atan(expectedY * Math.tan(Math.PI / 8));
    const route = new CameraTravel(); route.prepare(camera, star, 1, angle);
    route.sample(camera, 1); camera.updateMatrixWorld();
    expect(star.clone().project(camera).y).toBeCloseTo(expectedY);
    route.sample(camera, 0); expect(camera.quaternion.equals(original)).toBe(true);
  });
  for (const side of [-1, 1]) it(`returns exactly to the saved pose, route ${side}`, () => {
    const camera = new PerspectiveCamera(45);
    camera.position.set(-9, 4, 7); camera.lookAt(0, 0, 0);
    const position = camera.position.clone(); const orientation = camera.quaternion.clone();
    const star = new Vector3(side * 2.8, 2.5, 3.5);
    const route = new CameraTravel(); route.prepare(camera, star, side);
    route.sample(camera, 0); expect(camera.position.equals(position)).toBe(true);
    const previous = camera.position.clone();
    for (let i = 1; i <= 1000; i++) {
      route.sample(camera, i / 1000);
      expect(camera.position.distanceTo(previous)).toBeLessThan(.15);
      expect(camera.quaternion.toArray().every(Number.isFinite)).toBe(true);
      previous.copy(camera.position);
    }
    expect(camera.position.distanceTo(star)).toBeCloseTo(.65);
    const direction = new Vector3(); camera.getWorldDirection(direction);
    expect(direction.dot(star.clone().sub(camera.position).normalize())).toBeCloseTo(1);
    for (let i = 1000; i >= 0; i--) route.sample(camera, i / 1000);
    expect(camera.position.equals(position)).toBe(true);
    expect(camera.quaternion.equals(orientation)).toBe(true);
    expect(camera.fov).toBe(45);
    // Skip follows the same endpoint operations.
    route.sample(camera, 1); route.sample(camera, 0);
    expect(camera.position.equals(position)).toBe(true);
    expect(camera.quaternion.equals(orientation)).toBe(true);
  });
});
