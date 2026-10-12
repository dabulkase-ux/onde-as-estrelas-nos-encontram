export interface UniverseTextEntry {
  id: string;
  text: string;
  language: 'pt' | 'en' | 'it' | 'fr' | 'es';
  position: [number, number, number];
  rotation: number;
  scale: number;
  importance: number;
  glow: number;
  interactive?: boolean;
}

export interface FloralConstellation {
  id: string;
  center: [number, number, number];
  rotation: number;
  radius: number;
  scale: number;
  color: string;
}

export const universeTextEntries: UniverseTextEntry[] = [
  { id: 'portugal-1', text: 'Espanha', language: 'pt', position: [5.9, 0.8, -2.5], rotation: 0.25, scale: 0.72, importance: 0.85, glow: 0.82 },
  { id: 'portugal-2', text: 'Canadá', language: 'pt', position: [-5.9, -1.8, 5.2], rotation: -0.6, scale: 0.7, importance: 0.78, glow: 0.8 },
  { id: 'portugal-3', text: 'rosas', language: 'pt', position: [2.4, 2.2, 6.1], rotation: 0.8, scale: 0.7, importance: 0.72, glow: 0.76 },
  { id: 'portugal-4', text: 'buquê de lírios', language: 'pt', position: [-6.3, -2, -5.7], rotation: -0.4, scale: 0.74, importance: 0.78, glow: 0.8 },
  { id: 'portugal-5', text: 'seus olhos', language: 'pt', position: [4.4, -0.4, -5.5], rotation: 0.5, scale: 0.85, importance: 0.86, glow: 0.9 },
  { id: 'portugal-6', text: 'seu sorriso', language: 'pt', position: [-8, 1.3, 2], rotation: -0.7, scale: 0.8, importance: 0.82, glow: 0.9 },
  { id: 'portugal-7', text: 'nós', language: 'pt', position: [4.8, 2.4, 2.6], rotation: -0.3, scale: 0.62, importance: 0.68, glow: 0.72 },
  { id: 'portugal-8', text: 'lembro de você', language: 'pt', position: [-2.1, 3.5, 9], rotation: 0.35, scale: 0.8, importance: 0.84, glow: 0.9 },
  { id: 'portugal-9', text: 'fica comigo', language: 'pt', position: [9, -2, -4], rotation: -0.65, scale: 0.9, importance: 0.9, glow: 0.96 },
  { id: 'portugal-10', text: 'ainda quero descobrir', language: 'pt', position: [-9.4, 2.1, 5.7], rotation: 0.45, scale: 0.76, importance: 0.77, glow: 0.8 },
  { id: 'portugal-11', text: 'meu lugar favorito', language: 'pt', position: [-4.4, -2, -9.5], rotation: 0.8, scale: 0.78, importance: 0.82, glow: 0.82 },
  { id: 'en-1', text: 'your eyes', language: 'en', position: [8, 0.2, 0.8], rotation: -0.2, scale: 0.78, importance: 0.84, glow: 0.88 },
  { id: 'en-2', text: 'stay with me', language: 'en', position: [2.9, -3.8, 9.5], rotation: 0.55, scale: 0.86, importance: 0.9, glow: 0.94 },
  { id: 'en-3', text: 'my favorite person', language: 'en', position: [-6.1, 4, -6.8], rotation: -0.9, scale: 0.82, importance: 0.86, glow: 0.9 },
  { id: 'it-1', text: 'i tuoi occhi', language: 'it', position: [-2.5, 4.8, 7.5], rotation: 0.95, scale: 0.76, importance: 0.8, glow: 0.8 },
  { id: 'it-2', text: 'resta con me', language: 'it', position: [7, 3.6, -6.3], rotation: -0.6, scale: 0.8, importance: 0.88, glow: 0.9 },
  { id: 'es-1', text: 'tus ojos', language: 'es', position: [8.8, -1.3, -4.2], rotation: 0.3, scale: 0.76, importance: 0.82, glow: 0.85 },
  { id: 'es-2', text: 'quédate conmigo', language: 'es', position: [-8.8, -3.5, -5], rotation: -0.7, scale: 0.74, importance: 0.85, glow: 0.86 },
  { id: 'fr-1', text: 'tes yeux', language: 'fr', position: [3.3, -4.3, -8.8], rotation: 0.85, scale: 0.79, importance: 0.84, glow: 0.82 },
  { id: 'fr-2', text: 'reste avec moi', language: 'fr', position: [-1.4, 5.5, -9.4], rotation: -0.35, scale: 0.82, importance: 0.9, glow: 0.95 },
  { id: 'fr-3', text: 'mon amour', language: 'fr', position: [0.8, -5.2, 8.3], rotation: 0.5, scale: 0.78, importance: 0.88, glow: 0.9 },
];

export const universeFlowerClusters: FloralConstellation[] = [
  { id: 'rose', center: [-4.9, 1.6, -3.9], rotation: 0.8, radius: 0.55, scale: 0.38, color: '#f1ddbb' },
  { id: 'lily', center: [-1.6, -2.2, -5.5], rotation: -0.5, radius: 0.5, scale: 0.34, color: '#d7d3ff' },
  { id: 'lily-2', center: [3.4, 2.9, -4.7], rotation: 1.2, radius: 0.52, scale: 0.36, color: '#d4d8ff' },
];

export const universeHeartConfig = {
  center: [2.3, -0.8, 6.1] as [number, number, number],
  scale: 0.18,
  rotation: { z: 0.2 },
};
