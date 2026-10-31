import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { PackId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { backlogPath, importedDirectory, missing, unregistered } from './pack-writes.ts';

const ROOT = path.join(import.meta.dir, '../..');
const targets = { pack: PackId.parse('player-core'), vocabularyPack: PackId.parse('core-rules') };

describe('paths', () => {
  test('names the vocabulary directory and the backlog of a pack', () => {
    expect(importedDirectory(targets)).toBe('content/packs/core-rules/imported/player-core');
    expect(backlogPath(targets.pack)).toBe('content/import/player-core.json');
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

  test('the catalog pack files import every committed pack file, and nothing else', async () => {
    const catalogs = await Array.fromAsync(new Glob('libs/rules/catalog/src/*-packs.js').scan({ cwd: ROOT }));
    const sources = await Promise.all(catalogs.map(async (file) => Bun.file(path.join(ROOT, file)).text()));
    const source = sources.join('\n');
    const scanned = await Array.fromAsync(new Glob('content/packs/*/**/*.json').scan({ cwd: ROOT }));
    const files = scanned.map((file) => file.split(path.sep).join('/'));

    expect(unregistered(source, files)).toEqual([]);
    expect(missing(source, files)).toEqual([]);
  });
});
