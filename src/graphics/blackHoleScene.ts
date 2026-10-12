import * as THREE from 'three';
import { blackHoleFragments, type BlackHoleFragmentId } from '../experiences/blackHole/data';

const STAR_RADIUS = 1.55;
const CRYSTAL_THICKNESS = 0.12;
const ASSEMBLY_DURATION = 3600;
const crystalStart = [
  new THREE.Vector2(0, 1.15),
  new THREE.Vector2(0.34, 0),
  new THREE.Vector2(0, -1.15),
  new THREE.Vector2(-0.34, 0),
];

function starPiece(id: BlackHoleFragmentId) {
  const index = blackHoleFragments.findIndex(fragment => fragment.id === id);
  const tip = -Math.PI / 2 + index * Math.PI * 2 / 5;
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(Math.cos(tip), Math.sin(tip)).multiplyScalar(STAR_RADIUS),
    new THREE.Vector2(Math.cos(tip + Math.PI / 5), Math.sin(tip + Math.PI / 5)).multiplyScalar(STAR_RADIUS * 0.42),
    new THREE.Vector2(Math.cos(tip + Math.PI * 2 / 5), Math.sin(tip + Math.PI * 2 / 5)).multiplyScalar(STAR_RADIUS),
  ];
}

export function blackHoleStarPieceVertices(id: BlackHoleFragmentId) {
  return starPiece(id).map(point => [point.x, point.y] as const);
}

function makeCrystalGeometry(start: readonly THREE.Vector2[], end: readonly THREE.Vector2[], color: THREE.Color) {
  const positions: number[] = [];
  const colors: number[] = [];
  const base = color.clone();
  const facets = [0.76, 1.14, 0.94, 1.28, 0.62, 0.9, 1.18, 0.72, 1.04, 0.82, 0.68, 0.86];
  const append = (vertex: THREE.Vector3, shade: number) => {
    positions.push(vertex.x, vertex.y, vertex.z);
    const facetColor = base.clone().multiplyScalar(shade);
    colors.push(facetColor.r, facetColor.g, facetColor.b);
  };
  const geometry = new THREE.BufferGeometry();
  const initial = new Float32Array(48 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(initial, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(48 * 3), 3));
  const update = (progress: number) => {
    const interpolated = start.map((point, index) => point.clone().lerp(end[index], progress));
    const layerPoints = (layer: number) => interpolated.map(point => new THREE.Vector3(point.x, point.y, layer === 0 ? CRYSTAL_THICKNESS / 2 : -CRYSTAL_THICKNESS / 2));
    const front = layerPoints(0);
    const back = layerPoints(1);
    positions.length = 0; colors.length = 0;
    for (let edge = 0; edge < 4; edge++) {
      append(new THREE.Vector3(0, 0, CRYSTAL_THICKNESS / 2), facets[edge]);
      append(front[edge], facets[edge + 1]);
      append(front[(edge + 1) % 4], facets[edge + 2]);
      append(new THREE.Vector3(0, 0, -CRYSTAL_THICKNESS / 2), facets[edge + 4]);
      append(back[(edge + 1) % 4], facets[edge + 5]);
      append(back[edge], facets[edge + 6]);
      append(front[edge], facets[edge + 7]);
      append(back[edge], facets[edge + 8]);
      append(back[(edge + 1) % 4], facets[edge + 9]);
      append(front[edge], facets[edge + 7]);
      append(back[(edge + 1) % 4], facets[edge + 9]);
      append(front[(edge + 1) % 4], facets[edge + 10]);
    }
    geometry.getAttribute('position').array.set(positions);
    geometry.getAttribute('color').array.set(colors);
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('color').needsUpdate = true;
    geometry.computeVertexNormals();
  };
  update(0);
  return { geometry, update };
}

export interface BlackHoleProjection {
  id: BlackHoleFragmentId;
  x: number;
  y: number;
  visible: boolean;
}

export function createBlackHoleScene(scene: THREE.Scene, position: THREE.Vector3) {
  const portal = new THREE.Group();
  portal.position.copy(position);
  scene.add(portal);
  const accretion = new THREE.Group();
  portal.add(accretion);
  const eventHorizon = new THREE.Mesh(
    new THREE.SphereGeometry(0.82, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#010108' }),
  );
  accretion.add(eventHorizon);
  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  for (const [radius, tube, color, opacity] of [
    [1.04, 0.12, '#8c86ff', 0.54],
    [1.32, 0.055, '#7ec9ff', 0.38],
  ] as const) {
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    ringMaterials.push(material);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 80), material);
    ring.rotation.x = Math.PI * 0.5;
    ring.rotation.z = radius;
    accretion.add(ring);
  }
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 96;
  const glowContext = glowCanvas.getContext('2d')!;
  const glowGradient = glowContext.createRadialGradient(48, 48, 3, 48, 48, 48);
  glowGradient.addColorStop(0, 'rgba(110,116,255,0.55)');
  glowGradient.addColorStop(0.35, 'rgba(100,105,235,0.2)');
  glowGradient.addColorStop(1, 'rgba(70,72,160,0)');
  glowContext.fillStyle = glowGradient;
  glowContext.fillRect(0, 0, 96, 96);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const holeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: '#ffffff', transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  holeGlow.scale.set(3.8, 3.8, 1);
  portal.add(holeGlow);
  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 16, 12),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  portal.add(hitArea);
  const dustPositions = new Float32Array(45 * 3);
  for (let i = 0; i < 45; i++) {
    const angle = i * 2.399;
    const radius = 1.35 + (i % 7) * 0.19;
    dustPositions[i * 3] = Math.cos(angle) * radius;
    dustPositions[i * 3 + 1] = (i % 9 - 4) * 0.06;
    dustPositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: '#a7a9ff', size: 0.045, transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  portal.add(dust);

  const interior = new THREE.Group();
  interior.position.copy(position);
  scene.add(interior);
  const backdrop = new THREE.Mesh(
    new THREE.SphereGeometry(34, 18, 12),
    new THREE.MeshBasicMaterial({ color: '#03030a', side: THREE.BackSide }),
  );
  interior.add(backdrop);
  const ambientStars = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: '#b9baff', size: 0.035, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  const stars = new Float32Array(270 * 3);
  for (let i = 0; i < 270; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    stars.set([32 * Math.sin(phi) * Math.cos(theta), 32 * Math.cos(phi), 32 * Math.sin(phi) * Math.sin(theta)], i * 3);
  }
  ambientStars.geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  interior.add(ambientStars);
  const centralGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    color: '#736ac7', transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  centralGlow.scale.set(8, 8, 1);
  interior.add(centralGlow);

  const meshes = blackHoleFragments.map((fragment, index) => {
    const geometry = makeCrystalGeometry(crystalStart, starPiece(fragment.id), new THREE.Color(fragment.color));
    const material = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      vertexColors: true,
      metalness: 0.22,
      roughness: 0.19,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      clearcoat: 0.8,
      clearcoatRoughness: 0.16,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geometry.geometry, material);
    mesh.userData.fragmentId = fragment.id;
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
    mesh.position.set(Math.cos(angle) * 1.48, Math.sin(angle) * 1.42, (index % 2) * 0.1);
    mesh.rotation.z = angle + Math.PI / 2;
    mesh.scale.setScalar(0.9);
    mesh.userData.startPosition = mesh.position.clone();
    mesh.userData.startRotation = mesh.rotation.z;
    mesh.userData.updateGeometry = geometry.update;
    mesh.userData.geometryProgress = 0;
    mesh.userData.fragmentIndex = index;
    interior.add(mesh);
      const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.49, 0.009, 4, 36),
      new THREE.MeshBasicMaterial({ color: fragment.color, transparent: true, opacity: 0.28 }),
    );
    marker.position.copy(mesh.position);
    marker.rotation.x = 0.18;
    interior.add(marker);
    mesh.userData.discoveredMarker = marker;
    return mesh;
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const projection = new THREE.Vector3();
  let assemblyStarted: number | null = null;
  let formedNotified = false;

  return {
    portal,
    hitArea,
    accretion,
    dust,
    interior,
    meshes,
    raycaster,
    pointer,
    projection,
    get assemblyDuration() { return ASSEMBLY_DURATION; },
    select(event: PointerEvent, canvas: HTMLCanvasElement, camera: THREE.Camera, onSelect: (id: BlackHoleFragmentId) => void) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits[0]) onSelect(hits[0].object.userData.fragmentId as BlackHoleFragmentId);
    },
    animate(time: number, delta: number, reduced: boolean, discovered: readonly BlackHoleFragmentId[], persisted: boolean, onFormed: () => void) {
      portal.rotation.y = Math.sin(time * 0.18) * 0.06;
      accretion.rotation.y += (reduced ? 0 : delta * 0.00012);
      dust.rotation.y -= (reduced ? 0 : delta * 0.00008);
      const allFound = discovered.length === blackHoleFragments.length;
      if (persisted) {
        assemblyStarted = 0;
        formedNotified = true;
      } else if (allFound && assemblyStarted === null) assemblyStarted = time;
      const progress = persisted ? 1 : !allFound || assemblyStarted === null ? 0
        : reduced ? 1 : THREE.MathUtils.smoothstep((time - assemblyStarted) / ASSEMBLY_DURATION, 0, 1);
      for (let index = 0; index < meshes.length; index++) {
        const mesh = meshes[index];
        const id = mesh.userData.fragmentId as BlackHoleFragmentId;
        const found = discovered.includes(id);
        const marker = mesh.userData.discoveredMarker as THREE.Mesh;
        marker.visible = found && progress < 1;
        (marker.material as THREE.MeshBasicMaterial).opacity = found ? 0.2 + Math.sin(time * 0.0015) * 0.08 : 0.12;
        if (progress > 0) {
          if (Math.abs((mesh.userData.geometryProgress as number) - progress) > 0.002) {
            (mesh.userData.updateGeometry as (value: number) => void)(progress);
            mesh.userData.geometryProgress = progress;
          }
          mesh.position.copy(mesh.userData.startPosition as THREE.Vector3).multiplyScalar(1 - progress);
          mesh.rotation.z = (mesh.userData.startRotation as number) * (1 - progress);
          mesh.scale.setScalar(0.9 + progress * 0.1);
        } else {
          const startPosition = mesh.userData.startPosition as THREE.Vector3;
          mesh.position.copy(startPosition);
          if (!reduced) {
            mesh.position.y += Math.sin(time * 0.001 + index * 1.7) * 0.08;
            mesh.rotation.z = (mesh.userData.startRotation as number) + Math.sin(time * 0.0003 + index) * 0.04;
          }
        }
        (mesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(found ? 0x171322 : 0x080811);
      }
      if (progress === 1 && allFound && !formedNotified) {
        formedNotified = true;
        onFormed();
      }
      centralGlow.material.opacity = 0.16 + progress * 0.44 + (progress === 1 && !reduced ? Math.sin(time * 0.004) * 0.06 : 0);
      return progress;
    },
    project(width: number, height: number, camera: THREE.Camera): BlackHoleProjection[] {
      return meshes.map(mesh => {
        mesh.getWorldPosition(projection).project(camera);
        return {
          id: mesh.userData.fragmentId as BlackHoleFragmentId,
          x: (projection.x + 1) * width / 2,
          y: (1 - projection.y) * height / 2,
          visible: projection.z > -1 && projection.z < 1 && projection.x > -0.94 && projection.x < 0.94 && projection.y > -0.94 && projection.y < 0.94,
        };
      });
    },
    dispose() {
      for (const mesh of meshes) {
        const marker = mesh.userData.discoveredMarker as THREE.Mesh;
        marker.geometry.dispose();
        (marker.material as THREE.Material).dispose();
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      hitArea.geometry.dispose();
      (hitArea.material as THREE.Material).dispose();
      eventHorizon.geometry.dispose();
      (eventHorizon.material as THREE.Material).dispose();
      for (const ring of accretion.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh).slice(1)) {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      }
      ringMaterials.forEach(material => material.dispose());
      holeGlow.material.dispose();
      glowTexture.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      backdrop.geometry.dispose();
      (backdrop.material as THREE.Material).dispose();
      ambientStars.geometry.dispose();
      (ambientStars.material as THREE.Material).dispose();
      centralGlow.material.dispose();
    },
  };
}
