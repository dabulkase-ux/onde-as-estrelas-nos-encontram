import * as T from 'three';
import { eyeDustPolygons, irisContours, nebulaBands } from './eyesReference';

export const eyeWidth=6.4, eyeHeight=3.2;
export const referencePoint=(x:number,y:number,z=0)=>new T.Vector3((x/1600-.5)*eyeWidth,(.5-y/800)*eyeHeight,z);
export function seededRandom(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function hash(x:number,y:number){let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function noise(x:number,y:number){
  const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,fx=tx*tx*(3-2*tx),fy=ty*ty*(3-2*ty);
  const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
  return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
export function insidePolygon(x:number,y:number,polygon:readonly (readonly number[])[]) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function irisShape(index:number){
  const contour=irisContours[index],shape=new T.Shape();
  const first=referencePoint(contour[0][0],contour[0][1]);shape.moveTo(first.x,first.y);
  for(const curve of contour.slice(1)){
    if(curve.length!==6)continue;
    const a=referencePoint(curve[0],curve[1]),b=referencePoint(curve[2],curve[3]),c=referencePoint(curve[4],curve[5]);
    shape.bezierCurveTo(a.x,a.y,b.x,b.y,c.x,c.y);
  }
  shape.closePath();return shape;
}
function blankTexture(){const texture=new T.DataTexture(new Uint8Array([0,0,0,0]),1,1);texture.needsUpdate=true;return texture;}
/** Diffuse, seeded nebula only. No reference image or complete eye picture is used as a texture. */
export function cosmicTexture(white:boolean):T.Texture {
  if(typeof document==='undefined')return blankTexture();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');if(!ctx)return blankTexture();
  const random=seededRandom(white?2309:7021);
  const puff=(x:number,y:number,radius:number,color:string,alpha:number)=>{
    const gradient=ctx.createRadialGradient(x*.64,y*.64,0,x*.64,y*.64,radius*.64);
    gradient.addColorStop(0,`rgba(${color},${alpha})`);gradient.addColorStop(.38,`rgba(${color},${alpha*.45})`);gradient.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=gradient;ctx.fillRect((x-radius)*.64,(y-radius)*.64,radius*1.28,radius*1.28);
  };
  if(white){
    for(const polygon of eyeDustPolygons)for(let i=0;i<900;i++){
      const x=polygon[0][0]+random()*440,y=365+random()*155;
      if(insidePolygon(x,y,polygon))puff(x,y,8+random()*26,random()>.3?'170,181,228':'199,180,218',.025+random()*.07);
    }
  }else{
    for(const band of nebulaBands)for(let i=0;i<190;i++){
      const segment=Math.floor(random()*(band.length-1)),a=band[segment],b=band[segment+1],t=random();
      const x=a[0]+(b[0]-a[0])*t+(random()-.5)*135,y=a[1]+(b[1]-a[1])*t+(random()-.5)*130;
      puff(x,y,22+random()*74,random()>.65?'99,77,145':'54,82,140',.018+random()*.045);
    }
  }
  // Baked, multi-scale turbulence breaks up smooth puffs into irregular cosmic filaments.
  // This runs only once per scene mount, never in the frame loop.
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const index=(y*canvas.width+x)*4;if(pixels.data[index+3]===0)continue;
    const field=noise(x/45,y/38)*.45+noise(x/14,y/11)*.30+noise(x/4,y/3)*.18+hash(x,y)*.07;
    const filament=.18+Math.pow(field*1.8,3)*1.6;
    pixels.data[index+3]=Math.min(255,pixels.data[index+3]*filament);
    const shimmer=.66+hash(x+19,y+71)*.48;
    pixels.data[index]=Math.min(255,pixels.data[index]*shimmer);
    pixels.data[index+1]=Math.min(255,pixels.data[index+1]*shimmer);
    pixels.data[index+2]=Math.min(255,pixels.data[index+2]*shimmer);
  }
  ctx.putImageData(pixels,0,0);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}

export interface CosmicGrain { position:T.Vector3; color:T.Color; size:number; intensity:number; delay:number; }
export function cosmicGrains():CosmicGrain[]{
  const random=seededRandom(10714),grains:CosmicGrain[]=[];
  const shadows=[irisShape(0),irisShape(1)].map(shape=>shape.getPoints(36).map(p=>[p.x,p.y]));
  const grain=(x:number,y:number,eye:boolean)=>{
    const position=referencePoint(x,y,.02+(random()-.5)*.08);
    const dark=shadows.some(polygon=>insidePolygon(position.x,position.y,polygon));
    const color=new T.Color(eye?(random()>.7?'#dac7e5':'#9bb7ef'):(random()>.72?'#bfa2db':'#81a3dc'));
    grains.push({position,color,size:(eye?.009:.012)+random()*.018,intensity:(eye?.35:.14)+random()*(eye?.55:.40),delay:.25+random()*.38});
    if(dark)grains.at(-1)!.intensity*=.25;
  };
  for(const polygon of eyeDustPolygons)for(let i=0;i<2600;i++){
    const x=polygon[0][0]+random()*440,y=365+random()*155;if(insidePolygon(x,y,polygon))grain(x,y,true);
  }
  for(const band of nebulaBands)for(let i=0;i<520;i++){
    const segment=Math.floor(random()*(band.length-1)),a=band[segment],b=band[segment+1],t=random();
    grain(a[0]+(b[0]-a[0])*t+(random()-.5)*190,a[1]+(b[1]-a[1])*t+(random()-.5)*170,false);
  }
  for(let i=0;i<680;i++)grain(80+random()*1460,70+random()*640,false);
  return grains;
}
