import { describe, expect, it } from 'vitest';
import { checkPin, attemptMessage } from './pin';
import { actReducer } from './state';
import { createParticleData } from '../graphics/geometry';
describe('personalized entrance', () => {
  it('pads birthday days and distinguishes reversed order', () => { expect(checkPin('0309',3,9)).toBe('correct'); expect(checkPin('0903',3,9)).toBe('reversed'); expect(checkPin('9999',3,9)).toBe('incorrect'); expect(checkPin('0303',3,3)).toBe('correct'); });
  it('keeps the last hint for further attempts', () => { expect(attemptMessage(10,['one','two'])).toBe('two'); expect(attemptMessage(1,['one','two'])).toBe('one'); });
  it('ignores stale callbacks and prevents skipping an act', () => { expect(actReducer('lock',{type:'advance',from:'scan'})).toBe('lock'); expect(actReducer('scan',{type:'advance',from:'scan'})).toBe('recognized'); expect(actReducer('forming',{type:'restart'})).toBe('lock'); });
  it('generates stable, finite particles for both renderers', () => { const data = createParticleData(3600); expect(data.start.length).toBe(10800); for (const values of Object.values(data)) expect([...values].every(Number.isFinite)).toBe(true); expect(createParticleData(3600).galaxy).toEqual(data.galaxy); });
});
