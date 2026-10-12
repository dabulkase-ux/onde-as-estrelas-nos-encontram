import { describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Scene, Texture, Vector3 } from 'three';
import { CameraTravel } from '../../graphics/travel';
import { ShootingStar } from '../../graphics/shootingStar';
import { validateSubmission } from '../../../supabase/functions/_shared/security';
import { createWishDelivery, WishEncounterClock } from './logic';

describe('wish encounters and delivery',()=>{
 it('counts only visible idle exploration, with cooldown and ignored invitations',()=>{
  const clock=new WishEncounterClock();expect(clock.tick(60000,false)).toBe(false);
  expect(clock.tick(29999,true)).toBe(false);expect(clock.tick(1,true)).toBe(true);
  expect(clock.tick(60000,false)).toBe(false);expect(clock.invited).toBe(true);
  expect(clock.tick(45000,true)).toBe(false);expect(clock.tick(119999,true)).toBe(false);expect(clock.tick(1,true)).toBe(true);
  clock.dismiss();expect(clock.tick(30000,true)).toBe(false);
 });
 it('rejects empty/oversized input; submits only the existing contract; success is idempotent',async()=>{
  const send=vi.fn().mockResolvedValue({ok:true});const delivery=createWishDelivery(send);
  await expect(delivery.deliver('   ')).rejects.toThrow();await expect(delivery.deliver('x'.repeat(2001))).rejects.toThrow();expect(send).not.toHaveBeenCalled();
  const first=delivery.deliver(' Um desejo ');expect(delivery.deliver(' Um desejo ')).toBe(first);await first;
  const body=send.mock.calls[0][0];expect(body).toMatchObject({kind:'wish',text:'Um desejo',consent:true});expect(validateSubmission(body).table).toBe('wishes');
  await delivery.deliver('Um desejo');expect(send).toHaveBeenCalledTimes(1);
 });
 it('allows explicit retry with the same ID and never interprets a missing server confirmation as success',async()=>{
  const send=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({}).mockResolvedValue({ok:true});const delivery=createWishDelivery(send);
  await expect(delivery.deliver('Meu desejo')).rejects.toThrow();await expect(delivery.deliver('Meu desejo')).rejects.toThrow();await delivery.deliver('Meu desejo');
  expect(new Set(send.mock.calls.map(call=>call[0].submissionId)).size).toBe(1);
 });
 it('keeps the 3D star in view from different orientations and restores the near route',()=>{
  const scene=new Scene();const star=new ShootingStar(scene,new Texture());const camera=new PerspectiveCamera(45,320/740);
  for(const angle of [0,1,3]){
   camera.position.set(Math.cos(angle)*12,4,Math.sin(angle)*12);camera.lookAt(0,0,0);
   star.update('invited',camera,4000,false);camera.updateMatrixWorld();const point=star.group.position.clone().project(camera);
   expect(Math.abs(point.x)).toBeLessThan(1);expect(Math.abs(point.y)).toBeLessThan(1);
  }
  const original=camera.position.clone(),orientation=camera.quaternion.clone();const route=new CameraTravel();route.prepare(camera,star.group.position,0,0,true);route.sample(camera,1);route.sample(camera,0);
  expect(camera.position.equals(original)).toBe(true);expect(camera.quaternion.equals(orientation)).toBe(true);
  star.update('held',camera,16,true);const held=star.group.position.clone();star.update('delivered',camera,2500,false);expect(star.group.position.distanceTo(held)).toBeGreaterThan(10);
  expect(star.group.position.distanceTo(new Vector3())).toBeGreaterThan(0);star.dispose();expect(scene.children).toHaveLength(0);
 });
});
