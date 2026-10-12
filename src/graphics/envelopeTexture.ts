import { CanvasTexture, SRGBColorSpace } from 'three';
/** Two tiny shared maps for all six sprites; disposed with the existing engine. */
export function createEnvelopeTexture(read: boolean): CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = read ? '#b1cedf' : '#e6cda7'; ctx.fillStyle = '#15223b'; ctx.lineWidth = 2;
  ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.roundRect(16,36,96,60,5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(17,read ? 38 : 39); ctx.lineTo(64,read ? 17 : 70); ctx.lineTo(111,39); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18,93); ctx.lineTo(51,68); ctx.moveTo(110,93); ctx.lineTo(77,68); ctx.stroke();
  if (read) { ctx.fillStyle = '#b1cedf'; ctx.fillRect(43,40,42,14); }
  else { ctx.beginPath(); ctx.arc(64,69,5,0,Math.PI*2); ctx.stroke(); }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; return texture;
}
