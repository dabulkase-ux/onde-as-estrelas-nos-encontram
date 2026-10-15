import { describe, expect, it } from 'vitest';
import { emptyProgress, parseHerProgress, toggleColor } from './progress';
describe('her universe progress',()=>{
  it('limits the palette to two editable colors',()=>{
    expect(toggleColor(['azul','rosa'],'verde')).toEqual(['azul','rosa']);
    expect(toggleColor(['azul','rosa'],'azul')).toEqual(['rosa']);
    expect(toggleColor([],'azul')).toEqual(['azul']);
  });
  it('requires explicit acceptance and tolerates corrupt storage',()=>{
    expect(parseHerProgress('{')).toEqual(emptyProgress());
    expect(parseHerProgress(JSON.stringify({version:1,accepted:false,created:true}))).toEqual(emptyProgress());
  });
  it('restores birth, completed galaxies and interrupted travel safely',()=>{
    expect(parseHerProgress(JSON.stringify({version:1,accepted:true,stage:'travel',dialogue:2}))).toMatchObject({stage:'travel',dialogue:2});
    expect(parseHerProgress(JSON.stringify({version:1,accepted:true,stage:'creating',colors:['azul']})).stage).toBe('creating');
    expect(parseHerProgress(JSON.stringify({version:1,accepted:true,created:true,colors:['rosa','roxo','azul','invalid']}))).toMatchObject({created:true,stage:'ready',colors:['azul','rosa']});
  });
});
