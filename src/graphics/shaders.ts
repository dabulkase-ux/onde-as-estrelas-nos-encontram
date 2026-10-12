export const vertexShader = `
attribute vec3 aGalaxy;
attribute vec3 aColor;
attribute float aSeed;
uniform float uMorph;
uniform float uTime;
uniform float uDpr;
uniform float uScan;
uniform float uReduced;
uniform float uDust;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float p = smoothstep(0.0, 1.0, uMorph);
  vec3 g = aGalaxy;
  float rotation = uTime * .018 * (1.0-uReduced) + (1.0-p)*1.3;
  g.xz = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation)) * g.xz;
  float tilt = .54;
  g.yz = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * g.yz;
  float slant = -.3;
  g.xy = mat2(cos(slant), -sin(slant), sin(slant), cos(slant)) * g.xy;
  vec3 pos = mix(position, g, p);
  pos.z += sin(p*3.14159) * sin(aSeed*70.0) * 1.5;
  float scan = pow(max(0.0, 1.0 - abs(position.y - (uScan*2.0-1.0))*6.0), 2.0) * step(.001,uScan);
  vColor = mix(vec3(.69,.77,.81) + scan*.6, aColor, p);
  vAlpha = mix(.28 + scan*.65, .4 + aSeed*.55, p);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(64.0, mix(mix(1.8, 2.0 + pow(aSeed, 12.0)*15.0, p), 24.0+aSeed*42.0, uDust) * uDpr * (8.0 / -mv.z));
}`;
export const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;
uniform float uOpacity;
void main() {
  float d = length(gl_PointCoord - .5)*2.0;
  if (d > 1.0) discard;
  float glow = exp(-d*d*5.0) * .65 + exp(-d*d*32.0)*.35;
  gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity);
}`;
