import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { ContentKind, PackId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { backlogPath, importedDirectory, missing, packWrites, unregistered } from './pack-writes.ts';

const ROOT = path.join(import.meta.dir, '../..');
const targets = { pack: PackId.parse('player-core'), vocabularyPack: PackId.parse('core-rules') };

describe('packWrites', () => {
  test("writes the target pack's kinds into its directory and the vocabulary under core-rules/imported", () => {
    const files = [
      { pack: targets.vocabularyPack, kind: ContentKind.Trait, entries: [] },
      { pack: targets.pack, kind: ContentKind.Feat, entries: [] },
    ];

    expect(packWrites(files, targets).map(({ path: file }) => file)).toEqual([
      'content/packs/core-rules/imported/player-core/trait.json',
      'content/packs/player-core/feat.json',
    ]);
    expect(importedDirectory(targets)).toBe('content/packs/core-rules/imported/player-core');
    expect(backlogPath(targets.pack)).toBe('content/import/player-core.json');
  });

  test('refuses another pack, and core-rules as the target', () => {
    const stray = [{ pack: PackId.parse('monster-core'), kind: ContentKind.Creature, entries: [] }];

    expect(() => packWrites(stray, targets)).toThrow('monster-core');
    expect(() => packWrites([], { ...targets, pack: targets.vocabularyPack })).toThrow('never an import');
  });
});

describe('catalog registration', () => {
  const catalog = `pack(import('@pioneer/content/packs/player-core/pack.json'), [
    import('@pioneer/content/packs/player-core/ancestry.json'),
  ]);`;

  test('names written files the catalog does not import, and imports of files that are gone', () => {
    const files = ['content/packs/player-core/pack.json', 'content/packs/player-core/feat.json'];

    expect(unregistered(catalog, files)).toEqual(['content/packs/player-core/feat.json']);
    expect(missing(catalog, files)).toEqual(['@pioneer/content/packs/player-core/ancestry.json']);
  });

  test('json-packs.ts imports every committed pack file, and nothing else', async () => {
    const source = await Bun.file(path.join(ROOT, 'libs/rules/catalog/src/json-packs.ts')).text();
    const scanned = await Array.fromAsync(new Glob('content/packs/*/**/*.json').scan({ cwd: ROOT }));
    const files = scanned.map((file) => file.split(path.sep).join('/'));

    expect(unregistered(source, files)).toEqual([]);
    expect(missing(source, files)).toEqual([]);
  });
});
