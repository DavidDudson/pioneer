import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { FoundryReleaseTag, ImportFile, Sha256 } from '@pioneer/interop/foundry';
import { PackId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { canonicalJson } from './canonical-json.ts';
import { backlogPath, backlogWrite, importedDirectory, missing, unregistered } from './pack-writes.ts';

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

describe('backlog writes', () => {
  const pin = {
    tag: FoundryReleaseTag.parse('pf2e-8.6.0'),
    sha256: Sha256.parse('0'.repeat(64)),
  };

  test('a pack with no legacyPin prints no legacyPin and parses back', () => {
    const { json } = backlogWrite(targets.pack, ImportFile.parse({ pin, backlog: [] }), []);
    const text = canonicalJson(json);

    expect(text).not.toContain('undefined');
    expect(ImportFile.parse(JSON.parse(text)).legacyPin).toBeUndefined();
  });

  test('a pack with a legacyPin keeps it', () => {
    const { json } = backlogWrite(targets.pack, ImportFile.parse({ pin, legacyPin: pin, backlog: [] }), []);
    const parsed: unknown = JSON.parse(canonicalJson(json));

    expect(ImportFile.parse(parsed).legacyPin).toEqual(pin);
  });
});
