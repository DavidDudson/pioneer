import { describe, expect, test } from 'bun:test';

import { contentId, PackId, packContentsFromFiles, Slug } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

import { contentHash } from './content-hash';

const HEX_SHA256 = /^[\da-f]{64}$/u;

const PACK = PackId.parse('core-rules');
const packFile = { id: PACK, title: 'Core Rules', publisher: 'Paizo Inc.', license: 'ORC' };

function language(slug: string, name: string): object {
  return {
    id: contentId(PACK, Slug.parse(slug)),
    pack: PACK,
    kind: 'language',
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 89 }],
    description: [],
    rules: [],
    data: {},
  };
}

const common = language('common', 'Common');
const elven = language('elven', 'Elven');

function pack(file: object, entries: readonly object[] = [common, elven]): PackContents {
  return packContentsFromFiles(file, [entries]);
}

describe('contentHash', () => {
  test('is a SHA-256 hex digest', () => {
    expect(contentHash(pack(packFile))).toMatch(HEX_SHA256);
  });

  test('ignores the order keys were written in', () => {
    const reordered = { license: 'ORC', publisher: 'Paizo Inc.', title: 'Core Rules', id: PACK };
    expect(contentHash(pack(reordered))).toBe(contentHash(pack(packFile)));
  });

  test('changes when the pack file does', () => {
    expect(contentHash(pack({ ...packFile, title: 'Core Rules (errata)' }))).not.toBe(contentHash(pack(packFile)));
  });

  test('changes when an entry does', () => {
    const edited = pack(packFile, [common, language('elven', 'Elven (Thassilonian)')]);
    expect(contentHash(edited)).not.toBe(contentHash(pack(packFile)));
  });

  test('ignores the order entries were written in', () => {
    expect(contentHash(pack(packFile, [elven, common]))).toBe(contentHash(pack(packFile)));
  });
});
