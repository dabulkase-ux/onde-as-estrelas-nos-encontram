export const herUniverseKey = 'meu-universo.her-universe.v1';
import { notifyLocalUniverseChange } from './localChange';
export const palette = [
  { id: 'azul', label: 'Azul', hex: '#659cff' }, { id: 'verde', label: 'Verde', hex: '#78dfa8' },
  { id: 'rosa', label: 'Rosa', hex: '#ff91c5' }, { id: 'roxo', label: 'Roxo', hex: '#b396ff' },
  { id: 'dourado', label: 'Dourado', hex: '#f5cf83' }, { id: 'branco', label: 'Branco', hex: '#eef4ff' },
  { id: 'vermelho', label: 'Vermelho', hex: '#ff6b7b' }, { id: 'turquesa', label: 'Turquesa', hex: '#65e4df' },
] as const;
export type ColorId = typeof palette[number]['id'];
export type HerProgress = { version: 1; accepted: boolean; colors: ColorId[]; stage: 'travel' | 'colors' | 'creating' | 'ready'; created: boolean; dialogue?: number };
export const emptyProgress = (): HerProgress => ({ version: 1, accepted: false, colors: [], stage: 'colors', created: false });
export function toggleColor(colors: ColorId[], color: ColorId): ColorId[] {
  return colors.includes(color) ? colors.filter(value => value !== color) : colors.length < 2 ? [...colors, color] : colors;
}
export function parseHerProgress(raw: string | null): HerProgress {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1 || value.accepted !== true) return emptyProgress();
    const colors: ColorId[] = palette.filter(color => Array.isArray(value.colors) && value.colors.includes(color.id)).map(color => color.id).slice(0, 2);
    const created = value.created === true && colors.length > 0;
    const stage = created ? 'ready' : value.stage === 'travel' ? 'travel' : value.stage === 'creating' && colors.length ? 'creating' : 'colors';
    return { version: 1, accepted: true, colors, created, stage, ...(stage === 'travel' ? { dialogue: Number.isInteger(value.dialogue) ? Math.max(0, Math.min(3, value.dialogue)) : 0 } : {}) };
  } catch { return emptyProgress(); }
}
// Storage adapter: narrative state is independent of any future remote repository.
export const herProgressStore = {
  read(): HerProgress { try { return parseHerProgress(localStorage.getItem(herUniverseKey)); } catch { return emptyProgress(); } },
  save(progress: HerProgress): boolean { try { localStorage.setItem(herUniverseKey, JSON.stringify(progress)); notifyLocalUniverseChange(); return true; } catch { return false; } },
};
