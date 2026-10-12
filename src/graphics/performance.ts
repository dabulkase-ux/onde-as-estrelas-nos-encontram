import { experience as c } from '../config/experience';
export type Quality = 'low' | 'medium' | 'high';
export function initialQuality(): Quality {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (n.connection?.saveData || (n.deviceMemory && n.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4) return 'low';
  return innerWidth < 768 ? 'medium' : 'high';
}
export class PerformanceGovernor {
  private frames = 0; private sum = 0; private warmup = 90;
  constructor(public quality: Quality) {}
  sample(ms: number): Quality | null {
    if (this.warmup-- > 0) return null;
    this.sum += ms; this.frames++;
    if (this.frames < c.graphics.sampleFrames) return null;
    const average = this.sum / this.frames; this.frames = 0; this.sum = 0;
    if (average > c.graphics.slowFrameMs && this.quality !== 'low') { this.quality = this.quality === 'high' ? 'medium' : 'low'; this.warmup = 120; return this.quality; }
    return null;
  }
}
