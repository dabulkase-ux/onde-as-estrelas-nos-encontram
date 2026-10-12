export function seededRandom(seed = 42) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
export function fingerprintPoint(index: number, count: number): [number, number, number] {
  const ridge = index % 27; const t = Math.floor(index / 27) / Math.ceil(count / 27);
  const angle = t * Math.PI * 1.91 + Math.PI * .55;
  const radius = .065 + ridge * .028;
  return [Math.cos(angle) * radius * .78 + .035 * Math.sin(angle * 2), Math.sin(angle) * radius * 1.04 + .07 * Math.cos(angle * 2), 0];
}
export function createParticleData(count: number) {
  const random = seededRandom();
  const start = new Float32Array(count * 3); const galaxy = new Float32Array(count * 3); const colors = new Float32Array(count * 3); const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    start.set(fingerprintPoint(i, count), i * 3);
    const r = Math.pow(random(), 1.55) * 5.8; const arm = i % 4; const angle = arm * Math.PI / 2 + r * 1.35 + (random() - .5) * (.23 + .7 * r / 5.8);
    const scatter = Math.pow(random(), 3) * .65;
    galaxy.set([Math.cos(angle) * r + (random() - .5) * scatter, (random() - .5) * (.12 + scatter) * (1 - r / 8), Math.sin(angle) * r + (random() - .5) * scatter], i * 3);
    const warm = Math.max(0, 1 - r / 2.6); const rose = random() > .78;
    colors.set([.32 + warm * .68 + (rose ? .25 : 0), .42 + warm * .42, .8 - warm * .22], i * 3); seeds[i] = random();
  }
  return { start, galaxy, colors, seeds };
}
