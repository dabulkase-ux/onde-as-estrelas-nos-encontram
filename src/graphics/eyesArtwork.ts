import * as T from 'three';
import { eyeChains, eyeStars } from './eyesReference';
import { cosmicGrains, cosmicTexture, eyeWidth, eyeHeight, irisShape, referencePoint, seededRandom, type CosmicGrain } from './eyesLayers';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export function eyePaths():T.Vector3[][] {
  return eyeChains.map(chain=>chain.stars.map(id=>{const star=eyeStars.find(star=>star.id===id)!;return referencePoint(star.x*1600,star.y*800,star.depth);}));
}
const particleVertex=`
 attribute vec3 aColor; attribute vec3 aDrift;
 attribute float aSize; attribute float aIntensity; attribute float aDelay;
 uniform float uProgress; uniform float uReduced; uniform float uScale;
 varying vec3 vColor; varying float vAlpha;
 void main(){
   float arrival=smoothstep(.12,.47,uProgress);
   vec3 formed=position+aDrift*(1.-arrival)*(1.-uReduced);
   vec4 mv=modelViewMatrix*vec4(formed,1.);
   gl_Position=projectionMatrix*mv;
   gl_PointSize=clamp(aSize*uScale/max(1.,-mv.z),.7,42.);
   vColor=aColor;vAlpha=aIntensity*smoothstep(aDelay,aDelay+.075,uProgress);
 }`;
const particleFragment=`
 uniform sampler2D uGlow; uniform float uOpacity; uniform float uPrincipal;
 varying vec3 vColor; varying float vAlpha;
 void main(){
   vec2 p=gl_PointCoord*2.-1.;float r=length(p);
   float core=exp(-r*12.);float haze=exp(-r*r*6.)*.24;
   float rays=(exp(-abs(p.x)*24.)*exp(-abs(p.y)*2.)+exp(-abs(p.y)*24.)*exp(-abs(p.x)*2.))*.58*uPrincipal;
   float glow=texture2D(uGlow,gl_PointCoord).a*.12;
   float alpha=(core+haze+rays+glow)*vAlpha*uOpacity*(1.-smoothstep(.78,1.,r));
   if(alpha<.004)discard;
   gl_FragColor=vec4(mix(vColor,vec3(1.),core*.82),alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
 }`;
function particleMaterial(principal:boolean){return new T.ShaderMaterial({
  vertexShader:particleVertex,fragmentShader:particleFragment,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{uProgress:{value:0},uReduced:{value:0},uScale:{value:700},uGlow:{value:null},uOpacity:{value:1},uPrincipal:{value:Number(principal)}},
});}
function particleGeometry(grains:readonly CosmicGrain[],principal:boolean){
  const random=seededRandom(principal?913:821),geometry=new T.BufferGeometry();
  const positions=new Float32Array(grains.length*3),colors=new Float32Array(grains.length*3),drift=new Float32Array(grains.length*3);
  const sizes=new Float32Array(grains.length),intensities=new Float32Array(grains.length),delays=new Float32Array(grains.length);
  grains.forEach((grain,i)=>{
    grain.position.toArray(positions,i*3);grain.color.toArray(colors,i*3);
    drift[i*3]=(random()-.5)*(principal?4.3:.35);drift[i*3+1]=(random()-.5)*(principal?2.1:.2);drift[i*3+2]=(random()-.5)*(principal?1.3:.12);
    sizes[i]=grain.size;intensities[i]=grain.intensity;delays[i]=grain.delay;
  });
  for(const [name,values,itemSize] of [['position',positions,3],['aColor',colors,3],['aDrift',drift,3],['aSize',sizes,1],['aIntensity',intensities,1],['aDelay',delays,1]] as const)geometry.setAttribute(name,new T.BufferAttribute(values,itemSize));
  geometry.setDrawRange(0,0);return geometry;
}
interface Connection {points:T.Vector3[]; start:number; strength:number; color:T.Color;}
/** Batched artwork only; the existing camera/progress controller stays separate. */
export class EyesArtwork {
  readonly group=new T.Group();
  private connections:Connection[]=[];
  private lineGeometry=new T.BufferGeometry();
  private linePositions:Float32Array;
  private lineAlphas:Float32Array;
  private lineMaterial=new T.ShaderMaterial({
    vertexShader:`attribute vec3 aColor;attribute float aAlpha;varying vec3 vColor;varying float vAlpha;void main(){vColor=aColor;vAlpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){if(vAlpha<.001)discard;gl_FragColor=vec4(vColor,vAlpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  });
  private starMaterial=particleMaterial(true);
  private dustMaterial=particleMaterial(false);
  private starGeometry:T.BufferGeometry;
  private dustGeometry:T.BufferGeometry;
  private textures=[cosmicTexture(false),cosmicTexture(true)];
  private cloudMaterials=this.textures.map(map=>new T.MeshBasicMaterial({map,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,dithering:true}));
  private cloudGeometry=new T.PlaneGeometry(eyeWidth,eyeHeight);
  private irisGeometry=[0,1].map(i=>new T.ShapeGeometry(irisShape(i),36));
  private irisMaterial=new T.MeshBasicMaterial({color:'#01030a',transparent:true,opacity:0,depthWrite:false,dithering:true});
  constructor(scene:T.Scene){
    const random=seededRandom(981),paths=eyePaths();
    paths.forEach((path,index)=>{
      const chain=eyeChains[index],curve=new T.CatmullRomCurve3(path,false,'catmullrom',.55);
      for(let edge=0;edge<path.length-1;edge++){
        const points=Array.from({length:13},(_,i)=>curve.getPoint((edge+i/12)/(path.length-1)));
        const a=eyeStars.find(star=>star.id===chain.stars[edge])!,b=eyeStars.find(star=>star.id===chain.stars[edge+1])!;
        this.connections.push({points,start:.46+chain.stage+edge/(path.length-1)*.18,strength:chain.strength,color:new T.Color(a.color).lerp(new T.Color(b.color),.5)});
      }
    });
    const vertices=this.connections.length*12*2;
    this.linePositions=new Float32Array(vertices*3);this.lineAlphas=new Float32Array(vertices);
    const colors=new Float32Array(vertices*3);
    this.connections.forEach((connection,i)=>{for(let j=0;j<24;j++)connection.color.toArray(colors,(i*24+j)*3);});
    this.lineGeometry.setAttribute('position',new T.BufferAttribute(this.linePositions,3));
    this.lineGeometry.setAttribute('aColor',new T.BufferAttribute(colors,3));this.lineGeometry.setAttribute('aAlpha',new T.BufferAttribute(this.lineAlphas,1));
    this.lineGeometry.setDrawRange(0,0);
    const links=new T.LineSegments(this.lineGeometry,this.lineMaterial);links.name='eye-connections';links.frustumCulled=false;links.renderOrder=6;this.group.add(links);
    const principal=eyeStars.map(star=>({position:referencePoint(star.x*1600,star.y*800,star.depth),color:new T.Color(star.color),size:star.size,intensity:star.intensity,delay:star.id.includes('reflection')?.87+random()*.035:.025+random()*.22}));
    this.starGeometry=particleGeometry(principal,true);this.dustGeometry=particleGeometry(cosmicGrains(),false);
    const stars=new T.Points(this.starGeometry,this.starMaterial);stars.name='eye-landmarks';stars.renderOrder=7;stars.frustumCulled=false;this.group.add(stars);
    const dust=new T.Points(this.dustGeometry,this.dustMaterial);dust.name='eye-cosmic-dust';dust.renderOrder=5;dust.frustumCulled=false;this.group.add(dust);
    this.cloudMaterials.forEach((material,i)=>{const mesh=new T.Mesh(this.cloudGeometry,material);mesh.position.z=-.15+i*.03;mesh.renderOrder=i+1;mesh.name=i?'eye-light-dust':'eye-nebula';this.group.add(mesh);});
    this.irisGeometry.forEach((geometry,i)=>{const mesh=new T.Mesh(geometry,this.irisMaterial);mesh.position.z=.07;mesh.renderOrder=3;mesh.name=i?'right-dark-iris':'left-dark-iris';this.group.add(mesh);});
    this.group.name='eyes-reference-composition';this.group.visible=false;scene.add(this.group);
  }
  setTexture(texture:T.Texture){this.starMaterial.uniforms.uGlow.value=texture;this.dustMaterial.uniforms.uGlow.value=texture;}
  form(progress:number,reduced:boolean){
    const t=clamp(progress);
    for(const material of [this.starMaterial,this.dustMaterial]){
      material.uniforms.uProgress.value=t;material.uniforms.uReduced.value=Number(reduced);
      material.uniforms.uScale.value=(material===this.starMaterial?900:700)*(typeof window==='undefined'?1:Math.min(window.devicePixelRatio,2));
    }
    this.starGeometry.setDrawRange(0,t===0?0:this.starGeometry.attributes.position.count);
    this.dustGeometry.setDrawRange(0,t<.25?0:this.dustGeometry.attributes.position.count);
    for(let i=0;i<this.connections.length;i++){
      const connection=this.connections[i],p=clamp((t-connection.start)/.115);
      for(let segment=0;segment<12;segment++){
        const fraction=clamp(p*12-segment),a=connection.points[segment],b=connection.points[segment+1],vertex=i*24+segment*2,offset=vertex*3;
        this.linePositions[offset]=a.x;this.linePositions[offset+1]=a.y;this.linePositions[offset+2]=a.z;
        this.linePositions[offset+3]=a.x+(b.x-a.x)*fraction;this.linePositions[offset+4]=a.y+(b.y-a.y)*fraction;this.linePositions[offset+5]=a.z+(b.z-a.z)*fraction;
        this.lineAlphas[vertex]=this.lineAlphas[vertex+1]=fraction===0?0:connection.strength*.50*smooth((t-.43)/.13);
      }
    }
    this.lineGeometry.setDrawRange(0,t<.46?0:this.lineAlphas.length);
    this.lineGeometry.attributes.position.needsUpdate=true;this.lineGeometry.attributes.aAlpha.needsUpdate=true;
    this.cloudMaterials[0].opacity=.88*smooth((t-.37)/.51);this.cloudMaterials[1].opacity=.9*smooth((t-.48)/.37);
    this.irisMaterial.opacity=.89*smooth((t-.57)/.28);
  }
  dispose(){
    this.group.removeFromParent();this.lineGeometry.dispose();this.lineMaterial.dispose();
    this.starGeometry.dispose();this.dustGeometry.dispose();this.starMaterial.dispose();this.dustMaterial.dispose();
    this.cloudGeometry.dispose();this.cloudMaterials.forEach(material=>material.dispose());this.textures.forEach(texture=>texture.dispose());
    this.irisGeometry.forEach(geometry=>geometry.dispose());this.irisMaterial.dispose();
  }
}
