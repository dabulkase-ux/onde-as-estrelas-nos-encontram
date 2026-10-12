import { lostLetters } from '../experiences/letters/data';
import { experience } from '../config/experience';

export type UniverseObjectType = 'memory' | 'star' | 'planet' | 'constellation' | 'artifact' | 'image' | 'letter' | 'portal';

export interface UniverseObject {
  id: string;
  type: UniverseObjectType;
  position: [number, number, number];
  scale?: number;
  label?: string;
  texture?: string;
  contentId?: string;
  interactive?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
  onSelect?: () => void;
}

export const universeObjects: UniverseObject[] = experience.universe.objects.map((object) => ({
  ...object,
  position: [...object.position] as [number, number, number],
  type: object.type ?? 'memory',
  scale: object.scale ?? 1,
  interactive: object.interactive ?? true,
  metadata: object.metadata ?? { stage: 'placeholder', kind: object.type ?? 'memory' },
}));

universeObjects.push({ id: 'compatibility', type: 'constellation', position: [0, 2.7, 2], scale: 3, label: 'Compatibilidade', interactive: true });

universeObjects.push({ id: 'couple', type: 'star', position: [-2.8, 2.5, 3.5], scale: 3, label: 'Quiz de Casal', interactive: true });

universeObjects.push({ id: 'garden', type: 'portal', position: [4.8, -0.5, -3.4], scale: 4.5, label: 'Jardim Eterno', interactive: true });

universeObjects.push({ id: 'black-hole', type: 'artifact', position: [0.3, -2, -4.2], scale: 9, label: 'Buraco Negro dos Segredos', interactive: true });

for (const letter of lostLetters) universeObjects.push({id:letter.id, type:'letter', position:[...letter.position], scale:4, label:letter.title, interactive:true});
