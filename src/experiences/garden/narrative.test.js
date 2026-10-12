import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const base = new URL('../../../public/jardim-eterno/', import.meta.url);
const context = { window: {} };
runInNewContext(readFileSync(new URL('narrative.js', base), 'utf8'), context);
const story = context.window.GARDEN_STORY;

describe('approved garden narrative', () => {
  const files = [
    ['canada.txt', '66553cc7985a6977cf25897fca2efe025b820eb363055f2e39ca08aa8a1ed855', 20],
    ['convencido.txt', '64d5627ca999b00c065350786c921ea63bb771090b1bffdcae3f9648ad76a0d8', 25],
    ['pra ela.txt', '3cd64efb55a9205af4552857a61388acc985e7dfd0792a2740c28f5c8b6ec5df', 12],
  ];
  for (const [name, hash, paragraphs] of files) {
    it(`preserves approved text and paragraphs of ${name}`, () => {
      const text = readFileSync(new URL(name, base), 'utf8').replace(/\r\n/g, '\n');
      expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
      expect(story.files[name]).toBe(text);
      expect(text.split('\n\n')).toHaveLength(paragraphs);
    });
  }
  it('opens the approved files in narrative order', () => {
    expect(story.scripts.opening.at(-1)).toBe('Abrindo arquivo: canada.txt...');
    expect(story.scripts.interruption.at(-1)).toBe('Abrindo convencido.txt...');
    expect(story.scripts.resuming.at(-1)).toBe('Abrindo pra ela.txt...');
    expect(story.finalLines).toEqual([
      'Eu ainda não sei onde a vida vai nos levar.',
      'Mas, se um dia ela nos levar até aquele jardim no Canadá...',
      'Eu espero poder cultivá-lo com você.',
    ]);
    expect(JSON.stringify(story)).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it('limits NEXUS faults to the three approved interruption sequences', () => {
    for (const [name, lines] of Object.entries(story.scripts)) {
      expect(lines.filter(line => line.startsWith('ERRO:'))).toHaveLength(
        ['opening', 'interruption', 'final'].includes(name) ? 1 : 0,
      );
    }
  });
  it('explicitly classifies every terminal line without changing the scripts', () => {
    for (const [name, lines] of Object.entries(story.scripts)) {
      expect(story.scriptTypes[name]).toHaveLength(lines.length);
      lines.forEach((line, index) => {
        const type = story.scriptTypes[name][index];
        expect(['system', 'error', 'dialogue', 'file']).toContain(type);
        expect(type).toBe(line.startsWith('ERRO:') ? 'error'
          : /^(NEXUS|ARTHUR):/.test(line) ? 'dialogue'
          : index === lines.length - 1 && ['opening', 'interruption', 'resuming'].includes(name) ? 'file'
          : 'system');
      });
    }
  });
});
