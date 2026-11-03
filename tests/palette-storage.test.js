import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

const store = { 'mdothree-color:palettes': JSON.stringify([{ id: 'old', name: 'Stale', colors: ['#000000'], scheme: 'custom', createdAt: 1 }]) };
let failWrites = true;
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { if (failWrites) throw new Error('QuotaExceededError'); store[k] = v; },
};
const { savePalette, loadPalettes } = await import('../public/js/services/paletteStorage.js');

describe('palette memory fallback', () => {
  it('a save that only reached memory is not shadowed by stale readable storage', async () => {
    const id = await savePalette({ name: 'Fresh', colors: ['#ffffff'], scheme: 'custom' });
    const list = await loadPalettes();
    assert.ok(list.some(p => p.id === id), 'newly saved palette must be listed');
  });
  it('once storage works again, writes persist normally', async () => {
    failWrites = false;
    const id = await savePalette({ name: 'Later', colors: ['#123456'], scheme: 'custom' });
    const list = await loadPalettes();
    assert.ok(list.some(p => p.id === id));
    assert.ok(store['mdothree-color:palettes'].includes(id));
  });
});
