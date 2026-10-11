import { describe, expect, test } from 'bun:test';

import { readFoundryRelease } from './foundry-release';
import type { FoundryRelease } from './foundry-release';

const ROOT = 'pf2e-8.6.0';

const MANIFEST = JSON.stringify({
  packs: [
    { name: 'feats-srd', path: 'packs/feats', type: 'Item' },
    { name: 'journals', path: 'packs/journals', type: 'JournalEntry' },
    { name: 'iconics', path: 'packs/iconics', type: 'Actor' },
  ],
});

const PAGE = { _id: 'pAgEfIgHtEr00001', name: 'Fighter', type: 'text', text: { content: '<p>Warfare.</p>' } };

function release(files: Record<string, unknown>): FoundryRelease {
  return readFoundryRelease(
    new Map([
      [`${ROOT}/system.pf2e.json`, MANIFEST],
      [`${ROOT}/static/lang/en.json`, '{}'],
      ...Object.entries(files).map(([path, value]) => [`${ROOT}/${path}`, JSON.stringify(value)] as const),
    ]),
  );
}

describe('readFoundryRelease', () => {
  test('reads journals of journal packs beside the item documents, and no other pack types', () => {
    const read = release({
      'packs/pf2e/feats/sudden-charge.json': {
        _id: 'fEaT000000000002',
        name: 'Sudden Charge',
        type: 'feat',
        system: {},
      },
      'packs/pf2e/journals/archetypes.json': { _id: 'vx5FGEG34AxI2dow', name: 'Archetypes', pages: [PAGE] },
      'packs/pf2e/iconics/amiri.json': { _id: 'aCtOr00000000001', name: 'Amiri', type: 'character' },
    });

    expect(read.documents.map(({ document }) => document.name)).toEqual(['Sudden Charge']);
    expect(read.journals).toEqual([
      {
        pack: { name: 'journals', directory: 'journals' },
        path: 'packs/pf2e/journals/archetypes.json',
        journal: { _id: 'vx5FGEG34AxI2dow', name: 'Archetypes', pages: [PAGE] },
      },
    ]);
    expect(read.unreadable).toEqual([]);
  });

  test('a journal without the fields the importer reads is unreadable, not dropped', () => {
    const read = release({ 'packs/pf2e/journals/broken.json': { name: 'Broken' } });

    expect(read.journals).toEqual([]);
    expect(read.unreadable.map(({ path }) => path)).toEqual(['packs/pf2e/journals/broken.json']);
  });
});
