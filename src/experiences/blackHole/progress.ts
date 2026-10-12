import { blackHoleFragments, type BlackHoleFragmentId } from './data';

export const blackHoleStorageKey = 'meu-universo.black-hole-secrets.v1';

export interface BlackHoleProgress {
  discovered: BlackHoleFragmentId[];
  starFormed: boolean;
}

const fragmentIds = new Set<string>(blackHoleFragments.map(fragment => fragment.id));

export function readBlackHoleProgress(): BlackHoleProgress {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(blackHoleStorageKey) ?? 'null');
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 ||
      !('discovered' in parsed) || !Array.isArray(parsed.discovered)) {
      return { discovered: [], starFormed: false };
    }
    const discovered = [...new Set(parsed.discovered.filter(
      (id): id is BlackHoleFragmentId => typeof id === 'string' && fragmentIds.has(id),
    ))];
    const starFormed = 'starFormed' in parsed && parsed.starFormed === true &&
      discovered.length === blackHoleFragments.length;
    return { discovered, starFormed };
  } catch {
    return { discovered: [], starFormed: false };
  }
}

export function saveBlackHoleProgress(progress: BlackHoleProgress): boolean {
  try {
    const discovered = [...new Set(progress.discovered.filter(id => fragmentIds.has(id)))];
    localStorage.setItem(blackHoleStorageKey, JSON.stringify({
      version: 1,
      discovered,
      starFormed: progress.starFormed && discovered.length === blackHoleFragments.length,
    }));
    return true;
  } catch {
    return false;
  }
}
