import { EyesConstellation } from './eyesConstellation';
import { palette, type HerProgress } from '../experiences/herUniverse/progress';
import { ShootingStar, type ShootingState } from './shootingStar';
import * as THREE from 'three';
import { createEnvelopeTexture } from './envelopeTexture';
import { isLetterId, type LetterId } from '../experiences/letters/data';
import type { LetterProjection } from '../experiences/letters/LetterTargets';
import { CameraTravel, type Navigation } from './travel';
import { experience as c } from '../config/experience';
import { universeFlowerClusters, universeHeartConfig, universeTextEntries } from '../config/universeContent';
import { createParticleData } from './geometry';
import { createBlackHoleScene, type BlackHoleProjection } from './blackHoleScene';
import type { BlackHoleFragmentId } from '../experiences/blackHole/data';
import { initialQuality, PerformanceGovernor } from './performance';
import { fragmentShader, vertexShader } from './shaders';
import { universeObjects } from './universeObjects';

export interface GardenProjection { x: number; y: number; visible: boolean; }
export interface SceneInput { herView?: boolean; herCompatibilityAvailable?: boolean; herCoupleAvailable?: boolean; onHerCouple?: () => void; onHerCoupleProjection?: (point: GardenProjection) => void; herQuizOpen?: boolean; onHerQuiz?: () => void; onHerQuizProjection?: (point: GardenProjection) => void; herUniverse?: HerProgress; onHerArrived?: () => void; onHerCreated?: () => void; eyesWatched?: boolean; eyesHint?: boolean; onEyesReady?: () => void; onEyesProjection?: (point: GardenProjection) => void; shootingState?: ShootingState; onWish?: () => void; mode: 'hidden' | 'fingerprint' | 'galaxy'; scan: number; reduced: boolean; suspended?: boolean; navigation?: Navigation; onTravelComplete?: () => void; compatibilityCompleted?: boolean; lettersRead?: readonly LetterId[]; onLetter?: (id: LetterId) => void; onLetterProjection?: (points: readonly LetterProjection[]) => void; onGarden?: () => void; onGardenProjection?: (projection: GardenProjection) => void; onBlackHole?: () => void; onBlackHoleFragment?: (id: BlackHoleFragmentId) => void; onBlackHoleAccessProjection?: (projection: GardenProjection) => void; onBlackHoleProjection?: (points: readonly BlackHoleProjection[]) => void; blackHoleDiscovered?: readonly BlackHoleFragmentId[]; blackHoleStarFormed?: boolean; onBlackHoleStarFormed?: () => void; onCompatibility?: () => void; onCouple?: () => void; }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function mountEngine(canvas: HTMLCanvasElement, input: { current: SceneInput }, onFormed: () => void, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const governor = new PerformanceGovernor(initialQuality());
  renderer.setPixelRatio(Math.min(devicePixelRatio, governor.quality === 'low' ? 1 : c.graphics.maxDpr));
  const scene = new THREE.Scene();
  const eyes = new EyesConstellation(scene);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 120);
  const count = c.graphics[governor.quality];
  const data = createParticleData(count);
  const galaxyGeometry = new THREE.BufferGeometry();
  galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(data.start, 3));
  galaxyGeometry.setAttribute('aGalaxy', new THREE.BufferAttribute(data.galaxy, 3));
  galaxyGeometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
  galaxyGeometry.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uMorph: { value: 0 }, uTime: { value: 0 }, uDpr: { value: renderer.getPixelRatio() }, uScan: { value: 0 }, uOpacity: { value: 0 }, uReduced: { value: 0 }, uDust: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(galaxyGeometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const dustMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { ...material.uniforms, uDust: { value: 1 }, uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(galaxyGeometry, dustMaterial);
  dust.frustumCulled = false;
  scene.add(dust);

  const farStarCount = Math.min(2200, Math.max(500, count * 0.16));
  const farStarData = new Float32Array(farStarCount * 3);
  for (let i = 0; i < farStarCount; i++) {
    const idx = i * 3;
    const radius = 12 + Math.random() * 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    farStarData[idx] = radius * Math.sin(phi) * Math.cos(theta);
    farStarData[idx + 1] = radius * Math.cos(phi) * 0.8;
    farStarData[idx + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const farGeometry = new THREE.BufferGeometry();
  farGeometry.setAttribute('position', new THREE.BufferAttribute(farStarData, 3));
  const farStars = new THREE.Points(
    farGeometry,
    new THREE.PointsMaterial({
      color: '#dfeaff',
      size: 0.085,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  farStars.frustumCulled = false;
  scene.add(farStars);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const ctx = glowCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,247,223,1)');
  gradient.addColorStop(0.09, 'rgba(255,223,171,.9)');
  gradient.addColorStop(0.3, 'rgba(173,146,255,.28)');
  gradient.addColorStop(1, 'rgba(70,90,150,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(glowCanvas);
  eyes.setTexture(texture);
  const shooting = new ShootingStar(scene, texture);
  const herStarMaterial=new THREE.SpriteMaterial({map:texture,color:'#c2e2ff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const herStar=new THREE.Sprite(herStarMaterial);herStar.position.set(0,3,0);herStar.scale.setScalar(.7);herStar.visible=false;
  herStar.userData={id:'her-compatibility',object:{interactive:true,onSelect:()=>input.current.onHerQuiz?.()}};
  scene.add(herStar);
  const herConstellationGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.6,2.5,-.2),herStar.position.clone(),new THREE.Vector3(.7,2.7,.3)]);
  const herConstellationMaterial=new THREE.LineBasicMaterial({color:'#b8d4ff',transparent:true,opacity:.45});
  const herConstellation=new THREE.Line(herConstellationGeometry,herConstellationMaterial);herConstellation.visible=false;scene.add(herConstellation);
  const herCoupleMaterial=new THREE.SpriteMaterial({map:texture,color:'#c2e2ff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const herCoupleStar=new THREE.Sprite(herCoupleMaterial);herCoupleStar.position.set(0,1.2,0);herCoupleStar.scale.setScalar(.7);herCoupleStar.visible=false;
  herCoupleStar.userData={id:'her-couple',object:{interactive:true,onSelect:()=>input.current.onHerCouple?.()}};scene.add(herCoupleStar);

  const coreMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const core = new THREE.Sprite(coreMaterial);
  core.scale.set(4.3, 2.2, 1);
  scene.add(core);

  const nebulaMaterialPrimary = new THREE.SpriteMaterial({ map: texture, color: '#5869d9', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const nebulaPrimary = new THREE.Sprite(nebulaMaterialPrimary);
  nebulaPrimary.scale.set(15, 8, 1);
  nebulaPrimary.position.set(-2.5, 1.2, -5.6);
  nebulaPrimary.material.rotation = -0.3;
  scene.add(nebulaPrimary);

  const nebulaMaterialSecondary = new THREE.SpriteMaterial({ map: texture, color: '#d6b884', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const nebulaSecondary = new THREE.Sprite(nebulaMaterialSecondary);
  nebulaSecondary.scale.set(12, 7, 1);
  nebulaSecondary.position.set(4.3, -2, -8.2);
  nebulaSecondary.material.rotation = 0.5;
  scene.add(nebulaSecondary);

  const envelopeTexture = createEnvelopeTexture(false);
  const readEnvelopeTexture = createEnvelopeTexture(true);
  const markerGroup = new THREE.Group();
  scene.add(markerGroup);
  const markerRaycaster = new THREE.Raycaster();
  const markerPointer = new THREE.Vector2();
  let hoveredMarker: THREE.Sprite | null = null;
  let pressedMarker: THREE.Sprite | null = null;
  let pressedBlackHole = false;
  let hasExplored = false;
  const markerSpriteData = universeObjects.map((entry) => {
    const spriteMaterial = new THREE.SpriteMaterial({ color: entry.id === 'compatibility' ? '#89caff' : entry.id === 'couple' ? '#ffe0a2' : entry.id === 'black-hole' ? '#9294ff' : '#ffffff', map: entry.type === 'letter' ? envelopeTexture : texture, transparent: true, opacity: entry.id === 'black-hole' ? 0 : entry.type === 'letter' ? .78 : .42, depthWrite: false, blending: entry.type === 'letter' ? THREE.NormalBlending : THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(...entry.position);
    sprite.scale.setScalar((entry.scale ?? 1) * 0.12);
    sprite.userData = { id: entry.id, object: entry };
    markerGroup.add(sprite);
    return { sprite, object: entry, baseScale: entry.scale ?? 1, baseY: sprite.position.y };
  });
  const blackHoleObject = universeObjects.find(entry => entry.id === 'black-hole')!;
  const blackHoleScene = createBlackHoleScene(scene, new THREE.Vector3(...blackHoleObject.position));
  blackHoleScene.interior.visible = false;

  const portalGeometry: THREE.BufferGeometry[] = [];
  const portalMaterials: THREE.Material[] = [];
  const portal = new THREE.Group();
  portal.position.set(4.8, -0.5, -3.4);
  portal.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(-0.86, 0.19, 0.48).normalize(),
  );
  scene.add(portal);
  const portalHitArea = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 2.9),
    new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
  portalHitArea.position.set(0, 0.35, 0.1);
  portal.add(portalHitArea);
  portalGeometry.push(portalHitArea.geometry);
  portalMaterials.push(portalHitArea.material);
  const portalMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent = portal) => {
    portalGeometry.push(geometry);
    portalMaterials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    parent.add(mesh);
    return mesh;
  };
  const portalDisc = portalMesh(
    new THREE.CircleGeometry(1.03, 48),
    new THREE.MeshBasicMaterial({ color: '#31533d', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
  );
  portalDisc.position.set(0, 0.35, -0.09);
  const portalGlowMaterial = new THREE.MeshBasicMaterial({ color: '#d9c18f', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const portalGlow = portalMesh(new THREE.TorusGeometry(1.13, 0.14, 10, 48), portalGlowMaterial);
  portalGlow.position.y = 0.35;
  portalGlow.scale.y = 1.28;
  const portalRim = portalMesh(
    new THREE.TorusGeometry(1.13, 0.055, 10, 48),
    new THREE.MeshBasicMaterial({ color: '#f0dfb9', transparent: true, opacity: 0.88, depthWrite: false }),
  );
  portalRim.position.y = 0.35;
  portalRim.scale.y = 1.28;
  const portalInnerRim = portalMesh(
    new THREE.TorusGeometry(0.99, 0.018, 8, 48),
    new THREE.MeshBasicMaterial({ color: '#b2be8e', transparent: true, opacity: 0.55, depthWrite: false }),
  );
  portalInnerRim.position.set(0, 0.35, 0.04);
  portalInnerRim.scale.y = 1.28;
  for (const side of [-1, 1]) {
    const pier = portalMesh(
      new THREE.CylinderGeometry(0.055, 0.09, 0.48, 8),
      new THREE.MeshBasicMaterial({ color: '#d8c18c', transparent: true, opacity: 0.76 }),
    );
    pier.position.set(side * 0.98, -0.98, 0);
    const stem = portalMesh(
      new THREE.CylinderGeometry(0.014, 0.025, 0.67, 6),
      new THREE.MeshBasicMaterial({ color: '#718b64' }),
    );
    stem.position.set(side * 1.24, -1.12, 0.03);
    for (const leafSide of [-1, 1]) {
      const leaf = portalMesh(
        new THREE.SphereGeometry(0.2, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#6b8760', transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
      );
      leaf.position.set(side * 1.24 + leafSide * 0.13, -1.2, 0.04);
      leaf.scale.set(0.9, 0.28, 0.24);
      leaf.rotation.z = leafSide * 0.48;
    }
    const petalMaterial = new THREE.MeshBasicMaterial({
      color: side < 0 ? '#bd7776' : '#d9a784',
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
    });
    for (let petal = 0; petal < (side < 0 ? 5 : 3); petal++) {
      const bloom = portalMesh(new THREE.SphereGeometry(0.13, 8, 6), petalMaterial);
      const angle = petal / (side < 0 ? 5 : 3) * Math.PI * 2;
      bloom.position.set(
        side * 1.24 + Math.cos(angle) * 0.09,
        -0.77 + Math.sin(angle) * 0.06,
        0.08 + (petal % 2) * 0.035,
      );
      bloom.scale.set(0.82, side < 0 ? 0.72 : 1.28, 0.54);
      bloom.rotation.z = angle * 0.22;
    }
    if (side < 0) {
      const center = portalMesh(
        new THREE.SphereGeometry(0.055, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#dfc27e' }),
      );
      center.position.set(-1.24, -0.77, 0.17);
    }
  }
  const portalParticleData = new Float32Array(54);
  for (let i = 0; i < 18; i++) {
    const angle = i * 2.399;
    const radius = 0.22 + (i % 5) * 0.13;
    portalParticleData[i * 3] = Math.cos(angle) * radius;
    portalParticleData[i * 3 + 1] = 0.35 + Math.sin(angle) * radius * 1.2;
    portalParticleData[i * 3 + 2] = 0.1 + (i % 3) * 0.015;
  }
  const portalParticleGeometry = new THREE.BufferGeometry();
  portalParticleGeometry.setAttribute('position', new THREE.BufferAttribute(portalParticleData, 3));
  portalGeometry.push(portalParticleGeometry);
  const portalParticleMaterial = new THREE.PointsMaterial({ color: '#f3dfaf', size: 0.055, transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending });
  portalMaterials.push(portalParticleMaterial);
  const portalParticles = new THREE.Points(portalParticleGeometry, portalParticleMaterial);
  portal.add(portalParticles);

  const completionGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({length: 40}, (_, i) => {
    const t = i / 40 * Math.PI * 2;
    return new THREE.Vector3(16 * Math.sin(t) ** 3 * .035, (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * .035, 0);
  }));
  const completionMaterial = new THREE.LineBasicMaterial({ color: '#f1d49d', transparent: true, opacity: .7 });
  const completionHeart = new THREE.LineLoop(completionGeometry, completionMaterial);
  completionHeart.position.set(0, 2.7, 2);
  scene.add(completionHeart);
  const wordGroup = new THREE.Group();
  scene.add(wordGroup);
  const readableTextMapChunk = THREE.ShaderChunk.map_fragment.replace(
    'vec4 sampledDiffuseColor = texture2D( map, vMapUv );',
    'vec2 readableUv = gl_FrontFacing ? vec2( 1.0 - vMapUv.x, vMapUv.y ) : vMapUv;\n\tvec4 sampledDiffuseColor = texture2D( map, readableUv );',
  );
  const universeWords = universeTextEntries.map((entry) => {
    const canvas = document.createElement('canvas');
    const length = Math.max(150, Math.min(700, entry.text.length * 25 + 60));
    const height = 120;
    canvas.width = length;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, length, height);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${entry.importance > 0.84 ? '600' : '500'} ${Math.max(19, entry.scale * 29)}px Georgia`;
    const glowStrength = 9 + entry.glow * 8;
    const baseAlpha = 0.45 + entry.glow * 0.3;
    ctx.shadowBlur = glowStrength;
    ctx.shadowColor = 'rgba(191, 170, 255, 0.9)';
    ctx.fillStyle = `rgba(244, 235, 216, ${baseAlpha})`;
    ctx.fillText(entry.text, length / 2, height / 2 + 2);
    ctx.shadowBlur = Math.max(8, glowStrength * 0.55);
    ctx.shadowColor = 'rgba(255, 246, 228, 0.72)';
    ctx.fillStyle = `rgba(255, 250, 240, ${0.18 + entry.glow * 0.16})`;
    ctx.fillText(entry.text, length / 2, height / 2 + 2);
    ctx.restore();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.02, blending: THREE.NormalBlending });
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', readableTextMapChunk);
    };
    material.customProgramCacheKey = () => 'universe-text-readable-backface-uv-v2';
    const textSize = entry.importance > 0.88 ? 4 : entry.importance > 0.82 ? 3.8 : 3.5;
    const textHeight = entry.scale * (entry.importance > 0.84 ? 0.22 : 0.18) * textSize;
    const geometry = new THREE.PlaneGeometry(textHeight * length / height, textHeight);
    const sprite = new THREE.Mesh(geometry, material);
    sprite.position.set(...entry.position);
    sprite.lookAt(0, 0, 0);
    sprite.rotateZ(entry.rotation);
    sprite.userData = { id: entry.id, entry };
    wordGroup.add(sprite);
    return { sprite, entry, texture, geometry, baseSize: textHeight };
  });

  const heartGeometry = new THREE.BufferGeometry();
  const heartQuality = governor.quality === 'high' ? 260 : governor.quality === 'medium' ? 160 : 90;
  const heartPositions = new Float32Array(heartQuality * 3);
  const heartColor = new Float32Array(heartQuality * 3);
  for (let i = 0; i < heartQuality; i++) {
    const index = i * 3;
    const t = Math.random() * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const z = (Math.random() - 0.5) * 0.9;
    heartPositions[index] = x * 0.12;
    heartPositions[index + 1] = y * 0.12;
    heartPositions[index + 2] = z;
    heartColor[index] = 0.97;
    heartColor[index + 1] = 0.86;
    heartColor[index + 2] = 0.75;
  }
  heartGeometry.setAttribute('position', new THREE.BufferAttribute(heartPositions, 3));
  heartGeometry.setAttribute('color', new THREE.BufferAttribute(heartColor, 3));
  const heartMaterial = new THREE.PointsMaterial({ size: 0.055, transparent: true, opacity: 0.35, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const heart = new THREE.Points(heartGeometry, heartMaterial);
  heart.position.set(...universeHeartConfig.center);
  heart.lookAt(heart.position.clone().multiplyScalar(2));
  heart.rotateZ(universeHeartConfig.rotation.z);
  const heartOrientation = heart.quaternion.clone();
  heart.scale.setScalar(universeHeartConfig.scale);
  scene.add(heart);

  const flowerGroup = new THREE.Group();
  scene.add(flowerGroup);
  const flowerClusters = universeFlowerClusters.map((cluster) => {
    const count = governor.quality === 'high' ? 72 : governor.quality === 'medium' ? 46 : 28;
    const data = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const petalBase = (i % 6) / 6 * Math.PI * 2;
      const petalOffset = (i / count) * 3.2;
      const petal = Math.sin(petalBase + petalOffset) * 0.86 + 0.8;
      const angle = (i % 18) / 18 * Math.PI * 2 + (i % 3) * 0.18;
      const radius = (Math.random() * 0.42 + 0.18) * cluster.radius * (0.6 + 0.6 * petal);
      const x = Math.cos(angle) * radius * 0.8;
      const y = Math.sin(angle) * radius * 0.6;
      const z = (Math.random() - 0.5) * 0.68;
      data[idx] = x;
      data[idx + 1] = y;
      data[idx + 2] = z;
      colors[idx] = 0.94;
      colors[idx + 1] = 0.87;
      colors[idx + 2] = 1;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.04, transparent: true, opacity: 0.22, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    points.position.set(...cluster.center);
    points.rotation.y = cluster.rotation;
    points.scale.setScalar(cluster.scale);
    flowerGroup.add(points);
    return { points, material };
  });

  const initialAzimuth = Math.PI * 0.85;
  const initialPolar = 1.25;
  const cameraRig = {
    azimuth: initialAzimuth,
    polar: initialPolar,
    distance: 14.5,
    targetAzimuth: initialAzimuth,
    targetPolar: initialPolar,
    targetDistance: 14.5,
    dragging: false,
    lastX: 0,
    lastY: 0,
    pointerTravel: 0,
    pinchDistance: 0,
    pinchTouching: false,
  };
  const activeTouchPointers = new Map<number, { x: number; y: number }>();

  const updateCamera = () => {
    cameraRig.azimuth = THREE.MathUtils.lerp(cameraRig.azimuth, cameraRig.targetAzimuth, 0.12);
    cameraRig.polar = THREE.MathUtils.lerp(cameraRig.polar, cameraRig.targetPolar, 0.12);
    cameraRig.distance = THREE.MathUtils.lerp(cameraRig.distance, cameraRig.targetDistance, 0.12);
    const x = Math.sin(cameraRig.polar) * Math.cos(cameraRig.azimuth) * cameraRig.distance;
    const y = Math.cos(cameraRig.polar) * cameraRig.distance * 0.72;
    const z = Math.sin(cameraRig.polar) * Math.sin(cameraRig.azimuth) * cameraRig.distance;
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  };

  const setMarkerPointer = (event: PointerEvent) => {
    if (input.current.herUniverse) {
      const rect=canvas.getBoundingClientRect();markerPointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      markerRaycaster.setFromCamera(markerPointer,camera);
      const hit=input.current.herUniverse.stage==='ready'&&!input.current.herQuizOpen?markerRaycaster.intersectObjects([herStar,herCoupleStar].filter(star=>star.visible))[0]?.object:null;
      hoveredMarker=hit instanceof THREE.Sprite?hit:null;
      canvas.style.cursor=hoveredMarker?'pointer':'grab';return;
    }
    const rect = canvas.getBoundingClientRect();
    markerPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    markerRaycaster.setFromCamera(markerPointer, camera);
    const intersection = markerRaycaster.intersectObjects([
      ...markerSpriteData.filter(({ object }) => object.id !== 'black-hole').map(({ sprite }) => sprite),
      portalHitArea,
      blackHoleScene.hitArea,
    ], false)[0];
    hoveredMarker = intersection?.object === portalHitArea
      ? markerSpriteData.find(({ object }) => object.id === 'garden')?.sprite ?? null
      : intersection?.object === blackHoleScene.hitArea
        ? markerSpriteData.find(({ object }) => object.id === 'black-hole')?.sprite ?? null
      : intersection?.object instanceof THREE.Sprite ? intersection.object : null;
    canvas.style.cursor = hoveredMarker?.userData.object.interactive ? 'pointer' : 'grab';
    for (const marker of markerSpriteData) {
      const hovered = marker.sprite === hoveredMarker;
      marker.sprite.material.opacity = marker.object.type === 'letter' ? hovered ? .92 : .72 : hovered ? .82 : .42;
      marker.sprite.scale.setScalar(marker.baseScale * (hovered ? 0.17 : 0.12));
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if(input.current.herQuizOpen)return;
    if (input.current.navigation?.phase === 'BLACK_HOLE_ACTIVE' && !input.current.suspended) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      cameraRig.lastX = event.clientX;
      cameraRig.lastY = event.clientY;
      cameraRig.pointerTravel = 0;
      pressedBlackHole = true;
      canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    if ((input.current.mode !== 'galaxy' || input.current.suspended || (input.current.navigation && input.current.navigation.phase !== 'GALAXY_IDLE')) || event.pointerType === 'mouse' && event.button !== 0) return;
    setMarkerPointer(event);
    if (input.current.shootingState === 'invited' && markerRaycaster.intersectObject(shooting.head,false).length) { input.current.onWish?.(); return; }
    pressedMarker = hoveredMarker;
    hasExplored = true;
    cameraRig.pointerTravel = 0;
    if (event.pointerType === 'touch') {
      activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activeTouchPointers.size > 1) pressedMarker = null;
      cameraRig.dragging = activeTouchPointers.size === 1;
      cameraRig.pinchTouching = activeTouchPointers.size === 2;
      if (cameraRig.pinchTouching) {
        const [a, b] = [...activeTouchPointers.values()];
        cameraRig.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      } else if (cameraRig.dragging) {
        cameraRig.lastX = event.clientX;
        cameraRig.lastY = event.clientY;
      }
    } else {
      cameraRig.dragging = true;
      cameraRig.lastX = event.clientX;
      cameraRig.lastY = event.clientY;
    }
    canvas.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (input.current.navigation?.phase === 'BLACK_HOLE_ACTIVE') {
      if (pressedBlackHole) cameraRig.pointerTravel += Math.abs(event.clientX - cameraRig.lastX) + Math.abs(event.clientY - cameraRig.lastY);
      return;
    }
    if ((input.current.mode !== 'galaxy' || input.current.suspended || (input.current.navigation && input.current.navigation.phase !== 'GALAXY_IDLE'))) return;
    if (event.pointerType === 'touch') {
      const touchPointer = activeTouchPointers.get(event.pointerId);
      if (!touchPointer) return;
      const dx = event.clientX - touchPointer.x;
      const dy = event.clientY - touchPointer.y;
      touchPointer.x = event.clientX;
      touchPointer.y = event.clientY;
      cameraRig.pointerTravel += Math.abs(dx) + Math.abs(dy);
      if (activeTouchPointers.size === 2 && cameraRig.pinchTouching) {
        const [a, b] = [...activeTouchPointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        cameraRig.targetDistance = clamp(cameraRig.targetDistance + (cameraRig.pinchDistance - distance) * 0.02, 9.5, 20);
        cameraRig.pinchDistance = distance;
      } else if (activeTouchPointers.size === 1 && cameraRig.dragging) {
        const sensitivity = c.graphics.touchRotationSensitivity;
        cameraRig.targetAzimuth -= (dx / Math.max(window.innerWidth, 1)) * sensitivity;
        cameraRig.targetPolar = clamp(cameraRig.targetPolar + (dy / Math.max(window.innerHeight, 1)) * sensitivity, 0.8, 2.2);
      }
      if (input.current.reduced) wake();
      return;
    }
    if (!cameraRig.dragging && event.pointerType === 'mouse') {
      setMarkerPointer(event);
      return;
    }
    if (!cameraRig.dragging) return;
    const dx = event.clientX - cameraRig.lastX;
    const dy = event.clientY - cameraRig.lastY;
    cameraRig.pointerTravel += Math.abs(dx) + Math.abs(dy);
    cameraRig.lastX = event.clientX;
    cameraRig.lastY = event.clientY;
    cameraRig.targetAzimuth -= dx * 0.006;
    cameraRig.targetPolar = clamp(cameraRig.targetPolar + dy * 0.004, 0.8, 2.2);
    if (input.current.reduced) wake();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (input.current.navigation?.phase === 'BLACK_HOLE_ACTIVE') {
      if (pressedBlackHole && cameraRig.pointerTravel < 8) {
        blackHoleScene.select(event, canvas, camera, id => input.current.onBlackHoleFragment?.(id));
      }
      pressedBlackHole = false;
      return;
    }
    if (input.current.navigation && input.current.navigation.phase !== 'GALAXY_IDLE') return;
    if (event.pointerType === 'touch') {
      finishTouchPointer(event, false);
      return;
    }
    cameraRig.dragging = false;
    setMarkerPointer(event);
    if (cameraRig.pointerTravel < 8 && pressedMarker && pressedMarker === hoveredMarker && pressedMarker.userData.object.interactive) {
      if (pressedMarker.userData.id === 'compatibility') input.current.onCompatibility?.(); else if (pressedMarker.userData.id === 'couple') input.current.onCouple?.(); else if (pressedMarker.userData.id === 'garden') input.current.onGarden?.(); else if (pressedMarker.userData.id === 'black-hole') input.current.onBlackHole?.(); else if (isLetterId(pressedMarker.userData.id)) input.current.onLetter?.(pressedMarker.userData.id); else pressedMarker.userData.object.onSelect?.();
    }
    pressedMarker = null;
  };

  const finishTouchPointer = (event: PointerEvent, cancelled: boolean) => {
    if (!activeTouchPointers.has(event.pointerId)) return;
    if (!cancelled) setMarkerPointer(event);
    activeTouchPointers.delete(event.pointerId);
    if (activeTouchPointers.size === 2) {
      const [a, b] = [...activeTouchPointers.values()];
      cameraRig.pinchTouching = true;
      cameraRig.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      cameraRig.dragging = false;
    } else if (activeTouchPointers.size === 1) {
      const remaining = activeTouchPointers.values().next().value!;
      cameraRig.pinchTouching = false;
      cameraRig.pinchDistance = 0;
      cameraRig.dragging = true;
      cameraRig.lastX = remaining.x;
      cameraRig.lastY = remaining.y;
    } else {
      cameraRig.dragging = false;
      cameraRig.pinchTouching = false;
      cameraRig.pinchDistance = 0;
      if (!cancelled && cameraRig.pointerTravel < 8 && pressedMarker && pressedMarker === hoveredMarker && pressedMarker.userData.object.interactive) {
        if (pressedMarker.userData.id === 'compatibility') input.current.onCompatibility?.(); else if (pressedMarker.userData.id === 'couple') input.current.onCouple?.(); else if (pressedMarker.userData.id === 'garden') input.current.onGarden?.(); else if (pressedMarker.userData.id === 'black-hole') input.current.onBlackHole?.(); else if (isLetterId(pressedMarker.userData.id)) input.current.onLetter?.(pressedMarker.userData.id); else pressedMarker.userData.object.onSelect?.();
      }
      pressedMarker = null;
    }
    if (cancelled) pressedMarker = null;
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (input.current.navigation?.phase === 'BLACK_HOLE_ACTIVE') {
      pressedBlackHole = false;
      return;
    }
    if (event.pointerType === 'touch') {
      finishTouchPointer(event, true);
      return;
    }
    cameraRig.dragging = false;
    pressedMarker = null;
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') onPointerUp(event);
  };

  const onWheel = (event: WheelEvent) => {
    if ((input.current.mode !== 'galaxy' || input.current.suspended || (input.current.navigation && input.current.navigation.phase !== 'GALAXY_IDLE'))) return;
    event.preventDefault();
    hasExplored = true;
    cameraRig.targetDistance = clamp(cameraRig.targetDistance + event.deltaY * 0.004, 9.5, 20);
    if (input.current.reduced) wake();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('lostpointercapture', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  const onHerKey = (event: KeyboardEvent) => {
    if(input.current.herUniverse?.stage!=='ready'||input.current.herQuizOpen)return;
    if(event.key==='ArrowLeft')cameraRig.targetAzimuth-=.12;
    else if(event.key==='ArrowRight')cameraRig.targetAzimuth+=.12;
    else if(event.key==='ArrowUp')cameraRig.targetPolar=clamp(cameraRig.targetPolar-.1,.8,2.2);
    else if(event.key==='ArrowDown')cameraRig.targetPolar=clamp(cameraRig.targetPolar+.1,.8,2.2);
    else if(event.key==='+'||event.key==='=')cameraRig.targetDistance=clamp(cameraRig.targetDistance-1,9.5,20);
    else if(event.key==='-')cameraRig.targetDistance=clamp(cameraRig.targetDistance+1,9.5,20);
    else return;
    event.preventDefault();wake();
  };
  canvas.addEventListener('keydown',onHerKey);

  let width = 1, height = 1; let frame = 0; let last = 0; let elapsed = 0; let formation = 0; let didComplete = false; let disposed = false;
  let wake = () => {};

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    wake();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const cameraDirection = new THREE.Vector3();
  const toWordDirection = new THREE.Vector3();

  const travel = new CameraTravel();
  let savedRig: typeof cameraRig | null = null;
  let travelPhase = 'GALAXY_IDLE';
  let travelElapsed = 0;
  let travelFinished = false;
  const gardenEntryFrom = new THREE.Vector3();
  const gardenEntryTo = new THREE.Vector3();
  const gardenEntryStartOrientation = new THREE.Quaternion();
  const gardenEntryEndOrientation = new THREE.Quaternion();
  const blackHoleEntryFrom = new THREE.Vector3();
  const blackHoleEntryTo = new THREE.Vector3();
  const blackHoleArrivalPosition = new THREE.Vector3();
  const blackHoleEntryStartOrientation = new THREE.Quaternion();
  const blackHoleEntryEndOrientation = new THREE.Quaternion();
  const blackHoleArrivalOrientation = new THREE.Quaternion();
  const blackHoleInteriorMatrix = new THREE.Matrix4();
  const portalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(portal.quaternion);
  const portalLookMatrix = new THREE.Matrix4();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const publishPose = () => { canvas.dataset.cameraPose = JSON.stringify([...camera.position.toArray(), ...camera.quaternion.toArray()]); };
  const projectedLetter = new THREE.Vector3();
  const letterMarkers = markerSpriteData.filter(marker => isLetterId(marker.object.id));
  const letterProjections: LetterProjection[] = letterMarkers.map(marker => ({id:marker.object.id as LetterId, x:0, y:0, visible:false}));
  let lastBlackHoleProjection = -Infinity;
  let lastProjection = -Infinity;
  let suspensionStarted: number | null = null;
  let herStage = '';
  let herElapsed = 0;
  let herDone = false;
  let herColorKey = '';
  const herFrom = new THREE.Vector3();
  const herFromQ = new THREE.Quaternion();
  const herLookQ = new THREE.Quaternion();
  const herMatrix = new THREE.Matrix4();
  const originalColors = data.colors.slice();
  const sceneVisibility = new Map<THREE.Object3D, boolean>();
  const draw = (now: number) => {
    if (disposed || document.hidden) return;
    const her = input.current.herUniverse;
    if (her) {
      const reduced = input.current.reduced;
      const delta = last ? Math.min(now-last,50) : 16; last = now;
      if (!herStage) {
        scene.children.forEach(child=>sceneVisibility.set(child,child.visible));
        herFrom.copy(camera.position); herFromQ.copy(camera.quaternion);
        activeTouchPointers.clear(); cameraRig.dragging=false;
      }
      if (herStage !== her.stage) { herStage=her.stage;herElapsed=0;herDone=false; }
      herElapsed += delta;
      const colorKey=her.colors.join(',');
      if(herColorKey!==colorKey && her.colors.length) {
        herColorKey=colorKey;
        herCoupleMaterial.color.set(palette.find(color=>color.id===her.colors[her.colors.length-1])!.hex);
        const colors=her.colors.map(id=>new THREE.Color(palette.find(color=>color.id===id)!.hex));
        for(let i=0;i<count;i++) {
          const color=colors[Math.floor(data.seeds[i]*colors.length)%colors.length].clone();
          color.lerp(new THREE.Color('#ffffff'),Math.pow(data.seeds[i],5)*.42);
          color.toArray(data.colors,i*3);
        }
        galaxyGeometry.attributes.aColor.needsUpdate=true;
      }
      scene.children.forEach(child=>{child.visible=false;});
      material.uniforms.uMorph.value=1;material.uniforms.uReduced.value=Number(reduced);
      material.uniforms.uTime.value=reduced?0:now/1000;
      canvas.style.pointerEvents=her.stage==='ready'&&!input.current.herQuizOpen?'auto':'none';
      if(her.stage==='travel') {
        const p=Math.min(1,herElapsed/(reduced?3000:12500));
        const retreat=THREE.MathUtils.smoothstep(p,0,.4);
        points.visible=true;farStars.visible=!reduced;eyes.group.visible=p<.22;
        eyes.form(1-THREE.MathUtils.smoothstep(p,0,.22),reduced);
        material.uniforms.uOpacity.value=(1-THREE.MathUtils.smoothstep(p,.28,.52))*.85;
        points.scale.setScalar(1-retreat*.82);
        camera.position.copy(herFrom).lerp(new THREE.Vector3(0,8,38),retreat);
        herMatrix.lookAt(camera.position,new THREE.Vector3(0,0,0),worldUp);herLookQ.setFromRotationMatrix(herMatrix);
        camera.quaternion.copy(herFromQ).slerp(herLookQ,retreat);
        const flight=THREE.MathUtils.smoothstep(p,.4,.8);
        farStars.rotation.z=flight*.3;
        farStars.scale.set(1,1,1+Math.sin(flight*Math.PI)*5);
        farStars.position.z=-flight*85;
        farStars.material.opacity=Math.sin(THREE.MathUtils.smoothstep(p,.32,1)*Math.PI)*.9;
        if(p===1&&!herDone){herDone=true;input.current.onHerArrived?.();}
      } else {
        points.scale.setScalar(1);farStars.scale.setScalar(1);farStars.position.z=0;
        updateCamera();
        const birth=her.stage==='ready'?1:her.stage==='creating'?Math.min(1,herElapsed/(reduced?1200:6500)):0;
        points.visible=birth>0;
        galaxyGeometry.setDrawRange(0,Math.floor(count*birth));
        material.uniforms.uOpacity.value=birth*.95;
        canvas.dataset.herStarCount=String(Math.floor(count*birth));
        if(birth===1&&her.stage==='creating'&&!herDone){herDone=true;input.current.onHerCreated?.();}
        if(her.stage==='ready') {
          herStar.visible=!input.current.herView||Boolean(input.current.herCompatibilityAvailable);herConstellation.visible=herStar.visible;
          herStar.scale.setScalar(reduced?.7:.7+Math.sin(now*.0015)*.08);
          projectedLetter.copy(herStar.position).project(camera);const rect=canvas.getBoundingClientRect();
          const x=rect.left+(projectedLetter.x+1)*width/2,y=rect.top+(1-projectedLetter.y)*height/2;
          input.current.onHerQuizProjection?.({x,y,visible:projectedLetter.z>-1&&projectedLetter.z<1&&x>90&&x<width-90&&y>100&&y<window.innerHeight*.58});
          herCoupleStar.visible=!input.current.herView||Boolean(input.current.herCoupleAvailable);herCoupleStar.scale.setScalar(reduced ? .7 : .7+Math.sin(now*.0015+1)*.08);
          projectedLetter.copy(herCoupleStar.position).project(camera);
          const coupleX=rect.left+(projectedLetter.x+1)*width/2,coupleY=rect.top+(1-projectedLetter.y)*height/2;
          input.current.onHerCoupleProjection?.({x:coupleX,y:coupleY,visible:projectedLetter.z>-1&&projectedLetter.z<1&&coupleX>90&&coupleX<width-90&&coupleY>100&&coupleY<window.innerHeight*.58});
        }
      }
      canvas.dataset.herStage=her.stage;
      canvas.dataset.herColors=JSON.stringify(her.colors);
      publishPose();
      renderer.render(scene,camera);
      const settling=Math.abs(cameraRig.azimuth-cameraRig.targetAzimuth)>.0001||Math.abs(cameraRig.polar-cameraRig.targetPolar)>.0001||Math.abs(cameraRig.distance-cameraRig.targetDistance)>.0001;
      if(!reduced||her.stage==='travel'||her.stage==='creating'||settling)frame=requestAnimationFrame(draw);
      return;
    }
    if(herStage) {
      sceneVisibility.forEach((visible,child)=>{child.visible=visible;});sceneVisibility.clear();
      herStage='';herColorKey='';data.colors.set(originalColors);galaxyGeometry.attributes.aColor.needsUpdate=true;
      galaxyGeometry.setDrawRange(0,count);points.scale.setScalar(1);farStars.scale.setScalar(1);farStars.position.z=0;farStars.material.opacity=.7;
    }
    const navigation = input.current.navigation;
    const travelling = navigation?.phase === 'TRAVEL_TO_DESTINATION' || navigation?.phase === 'PORTAL_ENTRY' || navigation?.phase === 'BLACK_HOLE_ENTRY' || navigation?.phase === 'RETURN_TO_GALAXY';
    if (navigation && navigation.phase !== travelPhase) {
      travelPhase = navigation.phase; travelElapsed = 0; travelFinished = false;
      if (navigation.phase === 'EYES_ACTIVE') {
        savedRig = {...cameraRig}; eyes.begin(camera);
        activeTouchPointers.clear(); cameraRig.dragging=false; cameraRig.pinchTouching=false;
        publishPose(); canvas.dataset.savedCameraPose=canvas.dataset.cameraPose;
      } else if (navigation.phase === 'RETURN_TO_GALAXY' && navigation.destination === 'eyes') eyes.return(camera);
      else if (navigation.phase === 'TRAVEL_TO_DESTINATION') {
        savedRig = {...cameraRig};
        const marker = markerSpriteData.find(entry => entry.object.id === navigation.destination);
        const rect = canvas.getBoundingClientRect();
        const centerY = 1 - 2 * (window.innerHeight / 2 - rect.top) / rect.height;
        const screenTilt = -Math.atan(centerY * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
        travel.prepare(camera, navigation.destination === 'wish' ? shooting.group.position : navigation.destination === 'black-hole' ? blackHoleScene.portal.position : marker!.sprite.position, navigation.destination === 'couple' ? -1 : navigation.destination === 'wish' ? 0 : 1, navigation.destination === 'wish' ? 0 : screenTilt, navigation.destination === 'wish', navigation.destination === 'garden' ? portalNormal : undefined);
        canvas.dataset.destinationPosition = JSON.stringify(travel.destination.toArray());
        publishPose(); canvas.dataset.savedCameraPose = canvas.dataset.cameraPose;
        activeTouchPointers.clear(); cameraRig.dragging = false; cameraRig.pinchTouching = false;
        pressedMarker = null; hoveredMarker = null;
      } else if (navigation.phase === 'PORTAL_ENTRY') {
        gardenEntryFrom.copy(camera.position);
        gardenEntryTo.copy(portal.position).addScaledVector(portalNormal, -1.35);
        gardenEntryStartOrientation.copy(camera.quaternion);
        portalLookMatrix.lookAt(gardenEntryTo, portal.position, worldUp);
        gardenEntryEndOrientation.setFromRotationMatrix(portalLookMatrix);
      } else if (navigation.phase === 'BLACK_HOLE_ENTRY') {
        blackHoleArrivalPosition.copy(camera.position);
        blackHoleArrivalOrientation.copy(camera.quaternion);
        blackHoleEntryFrom.copy(camera.position);
        blackHoleEntryTo.set(blackHoleScene.portal.position.x, blackHoleScene.portal.position.y, blackHoleScene.portal.position.z + 10);
        blackHoleEntryStartOrientation.copy(camera.quaternion);
        blackHoleInteriorMatrix.lookAt(blackHoleEntryTo, blackHoleScene.portal.position, worldUp);
        blackHoleEntryEndOrientation.setFromRotationMatrix(blackHoleInteriorMatrix);
      }
    }
    if (input.current.suspended && !travelling && suspensionStarted === null) suspensionStarted = now;
    if (!input.current.suspended || travelling) suspensionStarted = null;
    const motionScale = navigation?.destination === 'eyes' && navigation.phase !== 'GALAXY_IDLE' ? 1 : navigation?.phase === 'WISH_ACTIVE' || navigation?.phase === 'BLACK_HOLE_ACTIVE' ? 1 : suspensionStarted === null ? 1 : input.current.reduced ? 0 : Math.max(0, 1 - (now - suspensionStarted) / 700);
    if (motionScale === 0) { canvas.style.pointerEvents = 'none'; last = 0; return; }
    if (disposed || document.hidden) return;
    const rawDt = last ? now - last : 16;
    const dt = Math.min(rawDt, 50) * motionScale;
    last = now;
    const { mode, scan, reduced } = input.current;

    if (mode === 'hidden') {
      formation = 0;
      didComplete = false;
      renderer.clear();
      return;
    }

    elapsed += dt / 1000;
    if (mode !== 'galaxy') {
      formation = 0;
      didComplete = false;
    } else {
      formation = Math.min(1, formation + dt / (reduced ? c.timing.reducedFormation : c.timing.formation));
    }

    const eased = formation * formation * (3 - 2 * formation);
    material.uniforms.uMorph.value = formation;
    material.uniforms.uScan.value = scan;
    material.uniforms.uReduced.value = Number(reduced);
    material.uniforms.uTime.value = elapsed;
    const blackHoleActive = navigation?.phase === 'BLACK_HOLE_ACTIVE';

    if (mode === 'galaxy') {
      canvas.style.pointerEvents = (input.current.suspended && !blackHoleActive) || travelling ? 'none' : 'auto';
      cameraRig.targetDistance = clamp(cameraRig.targetDistance, 9.5, 20);
      if (travelling && navigation && navigation.destination !== 'eyes') {
        travelElapsed += rawDt;
        const progress = reduced || navigation.skip ? 1 : Math.min(1, travelElapsed / (navigation.destination === 'wish' ? 2600 : isLetterId(navigation.destination) ? 3600 : navigation.destination === 'black-hole' ? 3800 : 5200));
        if (navigation.phase === 'PORTAL_ENTRY') {
          const entryProgress = reduced || navigation.skip ? 1 : Math.min(1, travelElapsed / 1200);
          const easedEntry = entryProgress * entryProgress * (3 - 2 * entryProgress);
          camera.position.lerpVectors(gardenEntryFrom, gardenEntryTo, easedEntry);
          camera.quaternion.slerpQuaternions(gardenEntryStartOrientation, gardenEntryEndOrientation, easedEntry);
          if (entryProgress === 1 && !travelFinished) {
            travelFinished = true; publishPose();
            input.current.onTravelComplete?.();
          }
        } else if (navigation.phase === 'BLACK_HOLE_ENTRY') {
          const entryProgress = reduced || navigation.skip ? 1 : Math.min(1, travelElapsed / 1800);
          const easedEntry = entryProgress * entryProgress * (3 - 2 * entryProgress);
          camera.position.lerpVectors(blackHoleEntryFrom, blackHoleEntryTo, easedEntry);
          camera.quaternion.slerpQuaternions(blackHoleEntryStartOrientation, blackHoleEntryEndOrientation, easedEntry);
          blackHoleScene.portal.visible = entryProgress < 0.58;
          blackHoleScene.interior.visible = entryProgress > 0.45;
        } else if (navigation.phase === 'RETURN_TO_GALAXY' && navigation.destination === 'black-hole' && navigation.blackHoleEntered && !reduced && !navigation.skip) {
          const exitDuration = 1800;
          if (travelElapsed < exitDuration) {
            const exitProgress = travelElapsed / exitDuration;
            const easedExit = exitProgress * exitProgress * (3 - 2 * exitProgress);
            camera.position.lerpVectors(blackHoleEntryTo, blackHoleArrivalPosition, easedExit);
            camera.quaternion.slerpQuaternions(blackHoleEntryEndOrientation, blackHoleArrivalOrientation, easedExit);
          } else {
            const returnProgress = Math.min(1, (travelElapsed - exitDuration) / 3800);
            travel.sample(camera, 1 - returnProgress);
          }
        } else if (navigation.phase === 'RETURN_TO_GALAXY' && navigation.destination === 'garden' && navigation.gardenEntered && !reduced && !navigation.skip) {
          const exitDuration = 1200;
          if (travelElapsed < exitDuration) {
            const exitProgress = travelElapsed / exitDuration;
            const easedExit = exitProgress * exitProgress * (3 - 2 * exitProgress);
            camera.position.lerpVectors(gardenEntryTo, gardenEntryFrom, easedExit);
            camera.quaternion.slerpQuaternions(gardenEntryEndOrientation, gardenEntryStartOrientation, easedExit);
          } else {
            const returnProgress = Math.min(1, (travelElapsed - exitDuration) / 5200);
            travel.sample(camera, 1 - returnProgress);
          }
        } else {
          const duration = navigation.phase === 'RETURN_TO_GALAXY' && navigation.destination === 'garden' && navigation.gardenEntered ? 0 : navigation.destination === 'wish' ? 2600 : isLetterId(navigation.destination) ? 3600 : navigation.destination === 'black-hole' ? 3800 : 5200;
          const routeProgress = reduced || navigation.skip ? 1 : Math.min(1, travelElapsed / duration);
          travel.sample(camera, navigation.phase === 'RETURN_TO_GALAXY' ? 1 - routeProgress : routeProgress);
        }
        const complete = navigation.phase === 'PORTAL_ENTRY'
          ? reduced || navigation.skip || travelElapsed >= 1200
          : navigation.phase === 'BLACK_HOLE_ENTRY'
            ? reduced || navigation.skip || travelElapsed >= 1800
            : navigation.phase === 'RETURN_TO_GALAXY' && navigation.destination === 'black-hole' && navigation.blackHoleEntered && !reduced && !navigation.skip
              ? travelElapsed >= 5600
          : navigation.phase === 'RETURN_TO_GALAXY' && navigation.destination === 'garden' && navigation.gardenEntered && !reduced && !navigation.skip
            ? travelElapsed >= 6400
            : progress === 1;
        if (complete && !travelFinished) {
          travelFinished = true; publishPose();
          if (navigation.phase === 'RETURN_TO_GALAXY' && savedRig) Object.assign(cameraRig, savedRig, {dragging:false, pinchTouching:false, pinchDistance:0});
          input.current.onTravelComplete?.();
        }
      } else if (!input.current.suspended && !blackHoleActive && navigation?.destination !== 'eyes') updateCamera();
      else if (navigation?.phase === 'GALAXY_IDLE' && navigation.destination === 'eyes') updateCamera();
      points.position.y = THREE.MathUtils.lerp(-0.7, 0.2, eased);
      dust.position.copy(points.position);
      dust.visible = governor.quality !== 'low' && eased > 0.05;
      dustMaterial.uniforms.uOpacity.value = eased * 0.028;
      farStars.rotation.y += (0.0005 + Number(!reduced) * 0.0006) * motionScale;
      farStars.rotation.x = Math.sin(elapsed * 0.15) * 0.12;
      core.position.y = points.position.y + 0.4;
      coreMaterial.opacity = Math.pow(eased, 2) * 0.9;
      nebulaPrimary.position.y = points.position.y + 0.9;
      nebulaSecondary.position.y = points.position.y - 0.6;
      nebulaMaterialPrimary.opacity = eased * 0.22;
      nebulaMaterialSecondary.opacity = eased * 0.18;
      markerGroup.visible = true;
      wordGroup.visible = true;
      portal.visible = true;
      blackHoleScene.portal.visible = !blackHoleActive && navigation?.phase !== 'BLACK_HOLE_ENTRY';
      blackHoleScene.interior.visible = blackHoleActive || navigation?.phase === 'BLACK_HOLE_ENTRY' && travelElapsed > 810;
      blackHoleScene.portal.rotation.y = reduced ? 0 : Math.sin(elapsed * 0.18) * 0.06;
      blackHoleScene.accretion.rotation.y += reduced ? 0 : rawDt * 0.00012;
      blackHoleScene.dust.rotation.y -= reduced ? 0 : rawDt * 0.00008;
      portalGlowMaterial.opacity = 0.13 + Number(!reduced) * (0.035 + Math.sin(elapsed * 0.7) * 0.025);
      portalParticles.rotation.z = reduced ? 0 : elapsed * 0.035;
      for (const marker of markerSpriteData) {
        marker.sprite.lookAt(camera.position);
        const envelope = marker.object.type === 'letter';
        if (envelope) marker.sprite.material.map = input.current.lettersRead?.includes(marker.object.id as LetterId) ? readEnvelopeTexture : envelopeTexture;
        const destinationMarker = marker.object.id === navigation?.destination && navigation.phase !== 'GALAXY_IDLE';
        if (destinationMarker) {
          marker.sprite.position.copy(travel.destination);
          const proximity = 1 - THREE.MathUtils.smoothstep(marker.sprite.position.distanceTo(camera.position), .65, 4);
          marker.sprite.material.opacity = .42 + proximity * .58;
          marker.sprite.scale.setScalar(marker.baseScale * (.12 + proximity * .32));
        } else {
          marker.sprite.material.opacity = marker.sprite === hoveredMarker ? envelope ? .92 : .82 : envelope ? .7 + Number(!reduced) * Math.sin(elapsed * .7 + marker.baseY) * .06 : .42;
          marker.sprite.scale.setScalar(marker.baseScale * (marker.sprite === hoveredMarker ? .17 : .12));
        }
        if (!destinationMarker) marker.sprite.position.y = marker.baseY + Math.sin(elapsed * 0.12 + marker.object.position[0]) * 0.012;
      }
      camera.getWorldDirection(cameraDirection);
      for (const word of universeWords) {
        const distance = word.sprite.position.distanceTo(camera.position);
        const alignment = cameraDirection.dot(toWordDirection.copy(word.sprite.position).sub(camera.position).normalize());
        const angleReveal = THREE.MathUtils.smoothstep(alignment, 0.2, 0.75);
        const nearFade = THREE.MathUtils.smoothstep(38 - distance, 0, 14);
        const alpha = (0.38 + word.entry.importance * 0.4) * nearFade * angleReveal * (0.5 + word.entry.glow * 0.5);
        word.sprite.material.opacity = alpha;
      }
      heart.visible = true;
      const heartDistance = heart.position.distanceTo(camera.position);
      const heartAlignment = cameraDirection.dot(toWordDirection.copy(heart.position).sub(camera.position).normalize());
      const heartAngleReveal = THREE.MathUtils.smoothstep(heartAlignment, 0.96, 0.995);
      const azimuthShift = Math.abs(Math.atan2(Math.sin(cameraRig.azimuth - initialAzimuth), Math.cos(cameraRig.azimuth - initialAzimuth)));
      const viewShift = Math.max(azimuthShift, Math.abs(cameraRig.polar - initialPolar));
      const explorationReveal = THREE.MathUtils.smoothstep(viewShift, 0.18, 0.75);
      const heartReveal = THREE.MathUtils.smoothstep(19 - heartDistance, 0, 8) * heartAngleReveal * explorationReveal;
      heart.visible = hasExplored && heartReveal > 0.12;
      heartMaterial.opacity = 0.1 + heartReveal * 0.42;
      heart.quaternion.copy(heartOrientation);
      if (!reduced) heart.rotateZ(Math.sin(elapsed * 0.12) * 0.0002);
      heart.scale.setScalar(universeHeartConfig.scale * (1 + Number(!reduced) * Math.sin(elapsed * 0.18) * 0.008));
      for (const cluster of flowerClusters) {
        const flowerDistance = cluster.points.position.distanceTo(camera.position);
        const flowerReveal = THREE.MathUtils.smoothstep(19 - flowerDistance, 0, 8);
        cluster.points.material.opacity = 0.035 + flowerReveal * 0.13;
        cluster.points.rotation.y += reduced ? 0 : 0.00008;
      }
      if (navigation?.phase === 'BLACK_HOLE_ENTRY') {
        const entryProgress = reduced || navigation.skip ? 1 : Math.min(1, travelElapsed / 1800);
        material.uniforms.uOpacity.value = 1 - entryProgress;
        markerGroup.visible = entryProgress < 0.96;
        wordGroup.visible = entryProgress < 0.96;
      } else if (blackHoleActive) {
        material.uniforms.uOpacity.value = 0;
        dustMaterial.uniforms.uOpacity.value = 0;
        points.visible = false;
        dust.visible = false;
        farStars.visible = false;
        core.visible = false;
        nebulaPrimary.visible = false;
        nebulaSecondary.visible = false;
        markerGroup.visible = false;
        wordGroup.visible = false;
        heart.visible = false;
        portal.visible = false;
        completionHeart.visible = false;
        blackHoleScene.animate(
          elapsed * 1000,
          rawDt,
          reduced,
          input.current.blackHoleDiscovered ?? [],
          input.current.blackHoleStarFormed ?? false,
          () => input.current.onBlackHoleStarFormed?.(),
        );
      } else {
        material.uniforms.uOpacity.value = 1;
        points.visible = true;
        core.visible = true;
        farStars.visible = true;
      }
    } else {
      canvas.style.pointerEvents = 'none';
      camera.position.set(0, 0, 15.5);
      camera.lookAt(0, 0, 0);
      points.position.y = 0;
      dust.visible = false;
      coreMaterial.opacity = 0;
      nebulaMaterialPrimary.opacity = 0;
      nebulaMaterialSecondary.opacity = 0;
      markerGroup.visible = false;
      wordGroup.visible = false;
      heart.visible = false;
      portal.visible = false;
      blackHoleScene.portal.visible = false;
      blackHoleScene.interior.visible = false;
    }

    completionHeart.visible = mode === 'galaxy' && Boolean(input.current.compatibilityCompleted);
    completionHeart.quaternion.copy(camera.quaternion);
    shooting.update(input.current.shootingState ?? 'hidden',camera,Math.min(rawDt,50),reduced);
    if(shooting.group.visible){projectedLetter.copy(shooting.group.position).project(camera);canvas.dataset.shootingPosition=JSON.stringify([(projectedLetter.x+1)*width/2,(1-projectedLetter.y)*height/2]);}
    else delete canvas.dataset.shootingPosition;
    const eyesActive = navigation?.destination === 'eyes' && navigation.phase !== 'GALAXY_IDLE';
    const eyeRect=eyesActive?canvas.getBoundingClientRect():null;
    const eyeY=window.innerHeight*(window.innerWidth > window.innerHeight ? .39 : .45);
    const eyeTilt=eyeRect?-Math.atan((1-2*(eyeY-eyeRect.top)/eyeRect.height)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))):0;
    const eyeIdle=mode==='galaxy' && navigation?.phase==='GALAXY_IDLE';
    const eyeResult = eyes.update(camera,rawDt,reduced,eyesActive,Boolean(input.current.eyesWatched)&&eyeIdle,Boolean(input.current.eyesHint)&&eyeIdle,eyeTilt);
    farStars.material.opacity = .7 * eyeResult.dim;
    if(eyesActive) {
      material.uniforms.uOpacity.value *= eyeResult.dim;
      coreMaterial.opacity *= eyeResult.dim; nebulaMaterialPrimary.opacity *= eyeResult.dim; nebulaMaterialSecondary.opacity *= eyeResult.dim;
      markerGroup.visible=false;wordGroup.visible=false;heart.visible=false;completionHeart.visible=false;portal.visible=false;blackHoleScene.portal.visible=false;
      canvas.dataset.eyesCount='2';canvas.dataset.eyesFormed=String(eyeResult.ready || canvas.dataset.eyesFormed==='true');
      publishPose();
      if(eyeResult.ready) input.current.onEyesReady?.();
      if(eyeResult.returned && !travelFinished) {
        travelFinished=true;if(savedRig)Object.assign(cameraRig,savedRig,{dragging:false,pinchTouching:false,pinchDistance:0});
        input.current.onTravelComplete?.();
      }
    } else {delete canvas.dataset.eyesCount;delete canvas.dataset.eyesFormed;}
    if(mode==='galaxy' && input.current.eyesWatched && navigation?.phase==='GALAXY_IDLE') {
      projectedLetter.copy(eyes.group.position).project(camera);
      input.current.onEyesProjection?.({x:(projectedLetter.x+1)*width/2,y:(1-projectedLetter.y)*height/2,visible:Math.abs(projectedLetter.x)<.9&&Math.abs(projectedLetter.y)<.9&&projectedLetter.z<1});
    }
    renderer.render(scene, camera);
    if(eyesActive && eyeRect){projectedLetter.copy(eyes.center).project(camera);canvas.dataset.eyesCenter=JSON.stringify([eyeRect.left+(projectedLetter.x+1)*width/2,eyeRect.top+(1-projectedLetter.y)*height/2]);}
    else delete canvas.dataset.eyesCenter;
    if (mode === 'galaxy' && navigation?.phase === 'GALAXY_IDLE' && now - lastProjection >= 80) {
      lastProjection = now;
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < letterMarkers.length; i++) {
        projectedLetter.copy(letterMarkers[i].sprite.position).project(camera);
        const point = letterProjections[i]; point.x = (projectedLetter.x + 1) * width / 2; point.y = (1 - projectedLetter.y) * height / 2;
        point.visible = projectedLetter.z > -1 && projectedLetter.z < 1 && point.x > 22 && point.x < width - 22 && point.y + rect.top > 22 && point.y + rect.top < window.innerHeight - 22;
      }
      input.current.onLetterProjection?.(letterProjections);
      projectedLetter.copy(portal.position).project(camera);
      const portalPoint = { x: (projectedLetter.x + 1) * width / 2, y: (1 - projectedLetter.y) * height / 2, visible: projectedLetter.z > -1 && projectedLetter.z < 1 && (projectedLetter.x > -1 && projectedLetter.x < 1) && (projectedLetter.y > -1 && projectedLetter.y < 1) };
      input.current.onGardenProjection?.(portalPoint);
      const blackHoleMarker = markerSpriteData.find(marker => marker.object.id === 'black-hole')!;
      projectedLetter.copy(blackHoleMarker.sprite.position).project(camera);
      input.current.onBlackHoleAccessProjection?.({
        x: rect.left + (projectedLetter.x + 1) * width / 2,
        y: rect.top + (1 - projectedLetter.y) * height / 2,
        visible: projectedLetter.z > -1 && projectedLetter.z < 1 && projectedLetter.x > -1 && projectedLetter.x < 1 && projectedLetter.y > -1 && projectedLetter.y < 1,
      });
    }
    if (blackHoleActive && now - lastBlackHoleProjection >= 80) {
      lastBlackHoleProjection = now;
      const rect = canvas.getBoundingClientRect();
      const fragmentPoints = blackHoleScene.project(width, height, camera).map(point => ({
        ...point,
        x: point.x + rect.left,
        y: point.y + rect.top,
      }));
      input.current.onBlackHoleProjection?.(fragmentPoints);
    }

    if (formation >= 1 && !didComplete) {
      didComplete = true;
      onFormed();
    }

    if (!reduced) {
      const quality = governor.sample(rawDt);
      if (quality) {
        galaxyGeometry.setDrawRange(0, Math.min(count, c.graphics[quality]));
        renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.3));
        material.uniforms.uDpr.value = renderer.getPixelRatio();
        renderer.setSize(width, height, false);
      }
    }

    const settling = !input.current.suspended && !travelling && (Math.abs(cameraRig.azimuth - cameraRig.targetAzimuth) > .0001 || Math.abs(cameraRig.polar - cameraRig.targetPolar) > .0001 || Math.abs(cameraRig.distance - cameraRig.targetDistance) > .0001);
    if (eyesActive && (!reduced || !eyes.formed || navigation?.phase==='RETURN_TO_GALAXY') || input.current.eyesHint || input.current.shootingState === 'invited' && !reduced || navigation?.phase === 'WISH_ACTIVE' && !reduced || blackHoleActive && !reduced || travelling && !travelFinished || settling || !(reduced && mode === 'galaxy' && formation === 1)) frame = requestAnimationFrame(draw);
  };

  const resume = () => {
    cancelAnimationFrame(frame);
    last = 0;
    lastProjection = -Infinity;
    if (!document.hidden) frame = requestAnimationFrame(draw);
  };

  wake = resume;
  document.addEventListener('visibilitychange', resume);

  const lost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    onFailure();
  };

  canvas.addEventListener('webglcontextlost', lost);
  frame = requestAnimationFrame(draw);

  return {
    wake: resume,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('lostpointercapture', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown',onHerKey);
      eyes.dispose();
      shooting.dispose();
      herStarMaterial.dispose();herConstellationGeometry.dispose();herConstellationMaterial.dispose();
      herCoupleMaterial.dispose();
      portalGeometry.forEach((geometry) => geometry.dispose());
      portalMaterials.forEach((portalMaterial) => portalMaterial.dispose());
      blackHoleScene.dispose();
      completionGeometry.dispose();
      completionMaterial.dispose();
      galaxyGeometry.dispose();
      farGeometry.dispose();
      heartGeometry.dispose();
      flowerClusters.forEach((cluster) => cluster.points.geometry.dispose());
      material.dispose();
      dustMaterial.dispose();
      texture.dispose();
      envelopeTexture.dispose(); readEnvelopeTexture.dispose();
      coreMaterial.dispose();
      nebulaMaterialPrimary.dispose();
      nebulaMaterialSecondary.dispose();
      markerSpriteData.forEach((marker) => marker.sprite.material.dispose());
      universeWords.forEach((word) => { word.texture.dispose(); word.geometry.dispose(); });
      flowerClusters.forEach((cluster) => cluster.material.dispose());
      renderer.dispose();
    },
  };
}
