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
  languages: [
    { lang: 'en', name: 'Main (English)', path: 'lang/en.json' },
    { lang: 'en', name: 'Rules Elements (English)', path: 'lang/re-en.json' },
    { lang: 'en', name: 'Kingmaker (English)', path: 'lang/kingmaker-en.json' },
    { lang: 'fr', name: 'Français', path: 'lang/fr.json' },
  ],
});

const LANG_FILES = {
  'static/lang/en.json': { PF2E: { TraitFire: 'Fire', Prompt: { Skill: 'Pick a skill' } } },
  'static/lang/re-en.json': { PF2E: { Prompt: { Skill: 'Select a skill.', Feat: 'Select a feat.' } } },
  'static/lang/kingmaker-en.json': { 'PF2E.Kingmaker': { Camp: 'Camp' } },
};

const PAGE = { _id: 'pAgEfIgHtEr00001', name: 'Fighter', type: 'text', text: { content: '<p>Warfare.</p>' } };

/** An archive of `files` beside the manifest and lang files, less the paths in `without`. */
function release(files: Record<string, unknown>, without: readonly string[] = []): FoundryRelease {
  return readFoundryRelease(
    new Map([
      [`${ROOT}/system.pf2e.json`, MANIFEST],
      ...Object.entries({ ...LANG_FILES, ...files })
        .filter(([path]) => !without.includes(path))
        .map(([path, value]) => [`${ROOT}/${path}`, JSON.stringify(value)] as const),
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

  test("merges the manifest's English lang files in order, a later string winning, dotted keys nested", () => {
    expect(release({}).lang).toEqual({
      PF2E: {
        TraitFire: 'Fire',
        Prompt: { Skill: 'Select a skill.', Feat: 'Select a feat.' },
        Kingmaker: { Camp: 'Camp' },
      },
    });
  });

  test('fails without an English lang file the manifest lists', () => {
    expect(() => release({}, ['static/lang/re-en.json'])).toThrow('static/lang/re-en.json');
  });

  test('a journal without the fields the importer reads is unreadable, not dropped', () => {
    const read = release({ 'packs/pf2e/journals/broken.json': { name: 'Broken' } });

    expect(read.journals).toEqual([]);
    expect(read.unreadable.map(({ path }) => path)).toEqual(['packs/pf2e/journals/broken.json']);
  });
});
