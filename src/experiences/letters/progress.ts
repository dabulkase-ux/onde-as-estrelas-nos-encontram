import { isLetterId, type LetterId } from './data';
export const letterStorageKey = 'meu-universo.lost-letters.v1';
export function readLetters(): LetterId[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(letterStorageKey) ?? 'null');
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('read' in value) || !Array.isArray(value.read)) return [];
    return [...new Set(value.read.filter((id): id is LetterId => typeof id === 'string' && isLetterId(id)))];
  } catch { return []; }
}
export function saveLetters(read: readonly LetterId[]): boolean {
  try { localStorage.setItem(letterStorageKey, JSON.stringify({version:1, read})); return true; } catch { return false; }
}
