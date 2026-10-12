import { afterEach, describe, expect, it } from 'vitest';
import { blackHoleFragments, blackHoleLetterText } from './data';
import { blackHoleStarPieceVertices } from '../../graphics/blackHoleScene';
import {
  blackHoleStorageKey,
  readBlackHoleProgress,
  saveBlackHoleProgress,
} from './progress';

const hashes = [
  '8693766472bd482da815ec23e811ab05d22cb9707263d372bb3de3352f9505df',
  '97eccd8fec03e76bf4aece0e199090cd4a3593d0bae2d8d9f5009ce5b699a09f',
  '74e37e8bc2f2311570834cf3c2d0e38850d95cb6e50516ca3994b5cf4ad84ba5',
  'e1d855b119f0e67fcc90be53de2e1fa20bc29c3908a5929d4acf5e98dd370850',
  'ba878a4fe2b6135201d1eb9c1e1a218501ee1bedc2f848f0a7096c37368d0d11',
];
const letterHash = '5a6f04ce6bc6411316f7398dafe89643384482de3e04edbe82b1025aef79ce92';
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let stored: Map<string, string>;

async function sha256(value: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function useMemoryStorage() {
  stored = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  });
}

afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('black-hole secret texts', () => {
  it('preserves all five approved fragment texts and colors', async () => {
    expect(blackHoleFragments).toHaveLength(5);
    expect(new Set(blackHoleFragments.map(fragment => fragment.color)).size).toBe(5);
    for (const [index, fragment] of blackHoleFragments.entries()) {
      await expect(sha256(fragment.text)).resolves.toBe(hashes[index]);
    }
  });

  it('preserves the complete approved letter and paragraph breaks', async () => {
    expect(blackHoleLetterText.split('\n\n')).toHaveLength(48);
    await expect(sha256(blackHoleLetterText)).resolves.toBe(letterHash);
  });
});

describe('physical five-piece star geometry', () => {
  it('forms five adjacent colored wedges with five outer tips and five inner notches', () => {
    expect(blackHoleFragments).toHaveLength(5);
    const pieces = blackHoleFragments.map(fragment => blackHoleStarPieceVertices(fragment.id));
    expect(pieces).toHaveLength(5);
    for (const piece of pieces) {
      expect(piece).toHaveLength(4);
      expect(piece[0]).toEqual([0, 0]);
    }
    for (let index = 0; index < pieces.length; index++) {
      expect(pieces[index][3][0]).toBeCloseTo(pieces[(index + 1) % pieces.length][1][0]);
      expect(pieces[index][3][1]).toBeCloseTo(pieces[(index + 1) % pieces.length][1][1]);
    }
    const boundary = pieces.flatMap(piece => piece.slice(1));
    expect(boundary.filter(([x, y]) => Math.hypot(x, y) > 1.5)).toHaveLength(10);
    expect(boundary.filter(([x, y]) => Math.hypot(x, y) < 1)).toHaveLength(5);
  });
});

describe('black-hole local progress', () => {
  it('saves discoveries in any order and restores the completed star', () => {
    useMemoryStorage();
    const discovered = [...blackHoleFragments].reverse().map(fragment => fragment.id);
    expect(saveBlackHoleProgress({ discovered, starFormed: true })).toBe(true);
    expect(readBlackHoleProgress()).toEqual({ discovered, starFormed: true });
  });

  it('rejects unknown fragment ids and a completed star without all fragments', () => {
    useMemoryStorage();
    stored.set(blackHoleStorageKey, JSON.stringify({
      version: 1,
      discovered: ['strength', 'not-a-fragment', 'strength'],
      starFormed: true,
    }));
    expect(readBlackHoleProgress()).toEqual({ discovered: ['strength'], starFormed: false });
  });

  it('returns safe empty progress for invalid stored data', () => {
    useMemoryStorage();
    stored.set(blackHoleStorageKey, '{invalid');
    expect(readBlackHoleProgress()).toEqual({ discovered: [], starFormed: false });
  });
});
