import { useEffect, useRef } from 'react';
import { createParticleData } from './geometry';
import type { SceneInput } from './engine';
import { experience as c } from '../config/experience';
import { palette } from '../experiences/herUniverse/progress';
export function FallbackCanvas({ input, onFormed, mode, reduced, shootingState }: { input: { current: SceneInput }; onFormed: () => void; mode: SceneInput['mode']; reduced: boolean; shootingState?: SceneInput['shootingState'] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const waking = useRef(() => {});
  const herStage=input.current.herUniverse?.stage;
  useEffect(() => { waking.current(); },[shootingState,herStage]);
  useEffect(() => {
    const el = canvas.current!; const ctx = el.getContext('2d')!; const data = createParticleData(c.graphics.fallback);
    let frame = 0, last = 0, morph = 0, elapsed = 0; let completed = false; let wake = () => {};
    let ownStage='', ownTime=0, ownDone=false;
    const resize = () => { el.width = el.clientWidth; el.height = el.clientHeight; wake(); }; const observer = new ResizeObserver(resize); observer.observe(el); resize();
    const draw = (now: number) => {
      if (document.hidden) return;
      const her=input.current.herUniverse;
      if(her) {
        const dt=last?Math.min(now-last,50):16;last=now;
        if(ownStage!==her.stage){ownStage=her.stage;ownTime=0;ownDone=false;}ownTime+=dt;
        ctx.clearRect(0,0,el.width,el.height);
        const birth=her.stage==='ready'?1:her.stage==='creating'?Math.min(1,ownTime/(reduced?1200:6500)):0;
        for(let i=0;i<Math.floor(c.graphics.fallback*birth);i++) {
          const j=i*3;ctx.fillStyle=palette.find(color=>color.id===her.colors[i%her.colors.length])?.hex??'#eef4ff';
          ctx.beginPath();ctx.arc(el.width/2+data.galaxy[j]*el.width/14,el.height*.32+data.galaxy[j+2]*el.width/32,.7+data.seeds[i],0,Math.PI*2);ctx.fill();
        }
        if(!ownDone&&her.stage==='travel'&&ownTime>=(reduced?3000:12500)){ownDone=true;input.current.onHerArrived?.();}
        if(!ownDone&&her.stage==='creating'&&birth===1){ownDone=true;input.current.onHerCreated?.();}
        el.dataset.herStage=her.stage;el.dataset.herStarCount=String(Math.floor(c.graphics.fallback*birth));
        frame=requestAnimationFrame(draw);return;
      }
      if (input.current.suspended && input.current.navigation?.destination !== 'wish') { frame = requestAnimationFrame(draw); last = 0; return; }
      const dt = last ? Math.min(now-last,50) : 16; last = now;
      const { scan } = input.current;
      if(mode==='hidden') { ctx.clearRect(0,0,el.width,el.height); return; }
      elapsed += reduced ? 0 : dt * .000018;
      if (mode !== 'galaxy') { morph = 0; completed = false; } else morph = Math.min(1, morph + dt / (reduced ? c.timing.reducedFormation : c.timing.formation));
      const p = morph*morph*(3-2*morph); ctx.clearRect(0,0,el.width,el.height);
      {
        const scale = Math.min(el.width/11,el.height/9);
        ctx.globalCompositeOperation = 'lighter';
        for (let i=0;i<c.graphics.fallback;i++) {
          const j=i*3; const x=data.galaxy[j]*Math.cos(elapsed)-data.galaxy[j+2]*Math.sin(elapsed); const y=(data.galaxy[j]*Math.sin(elapsed)+data.galaxy[j+2]*Math.cos(elapsed))*.43;
          const gx=(x*.955+y*.296)*scale; const gy=(y*.955-x*.296)*scale;
          const fingerScale=el.height<=650?100:118; const fingerCenter=el.height<=650?.53:.51;
          const px=data.start[j]*fingerScale*(1-p)+gx*p+el.width/2; const py=-data.start[j+1]*fingerScale*(1-p)+gy*p+el.height*(fingerCenter+(.39-fingerCenter)*p);
          ctx.fillStyle = p < .1 ? `rgba(170,193,206,${.4 + scan*.5})` : `rgba(${Math.floor(data.colors[j]*255)},${Math.floor(data.colors[j+1]*255)},${Math.floor(data.colors[j+2]*255)},.7)`;
          ctx.beginPath(); ctx.arc(px,py,.65+data.seeds[i]*p,0,Math.PI*2); ctx.fill();
        }
        if(p>0) { const glow = ctx.createRadialGradient(el.width/2,el.height*.39,0,el.width/2,el.height*.39,scale*1.3); glow.addColorStop(0,`rgba(255,224,185,${p*.8})`); glow.addColorStop(.2,`rgba(197,157,131,${p*.22})`); glow.addColorStop(1,'transparent'); ctx.fillStyle=glow; ctx.fillRect(0,0,el.width,el.height); }
        ctx.globalCompositeOperation = 'source-over';
      }
      if(mode==='galaxy' && input.current.shootingState && input.current.shootingState!=='hidden' && input.current.shootingState!=='delivered') {
       const x=el.width*.55,y=el.height*.32;ctx.fillStyle='#e7cb97';ctx.shadowColor='#e7cb97';ctx.shadowBlur=reduced?6:14;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      }
      if (morph === 1 && !completed) { completed = true; onFormed(); }
      if (!(reduced && morph === 1)) frame = requestAnimationFrame(draw);
    };
    const visibility = () => { cancelAnimationFrame(frame); last=0; if(!document.hidden) frame=requestAnimationFrame(draw); };
    wake = visibility; waking.current = visibility;
    document.addEventListener('visibilitychange',visibility); frame=requestAnimationFrame(draw);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('visibilitychange',visibility); };
  },[input,onFormed,mode,reduced]);
  return <canvas className="cosmos-canvas" ref={canvas} aria-hidden="true" data-renderer="canvas2d"/>;
}

