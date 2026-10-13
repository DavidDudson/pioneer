import { describe, expect, test } from 'bun:test';

import { entrySlug, PackId, Slug } from '@pioneer/rules/sdk';

import { referencedId } from './content-reference';
import { CURRENT_FORMAT_VERSION, PIONEER_CHARACTER_FORMAT, PioneerCharacterFile } from './pioneer-character-file';
import { unmatchedContent } from './unmatched-content';

const pack = PackId.parse('player-core');
const human = { source: pack, slug: entrySlug('ancestry', Slug.parse('human')) };
const sword = { source: pack, slug: entrySlug('weapon', Slug.parse('longsword')) };
const shield = { source: pack, slug: entrySlug('shield', Slug.parse('steel-shield')) };

function fileOf(character: Record<string, unknown>): PioneerCharacterFile {
  return PioneerCharacterFile.parse({
    format: PIONEER_CHARACTER_FORMAT,
    formatVersion: CURRENT_FORMAT_VERSION,
    character,
  });
}

const file = fileOf({
  build: { choices: { ancestry: human } },
  inventory: {
    items: [{ item: sword }, { item: sword }, { item: shield }],
  },
});

describe('unmatchedContent', () => {
  test('is empty when the namer knows every entry', () => {
    expect(unmatchedContent(file, () => human)).toStrictEqual([]);
  });

  test('lists each unknown entry once, grouped by kind', () => {
    expect(unmatchedContent(file, () => undefined)).toStrictEqual([
      { kind: 'ancestry', entries: [human] },
      { kind: 'weapon', entries: [sword] },
      { kind: 'shield', entries: [shield] },
    ]);
  });
});

describe('unmatchedContent with some entries loaded', () => {
  test('leaves out the entries the namer names', () => {
    const names = new Map([[referencedId(human), human]]);

    expect(unmatchedContent(file, (id) => names.get(id))).toStrictEqual([
      { kind: 'weapon', entries: [sword] },
      { kind: 'shield', entries: [shield] },
    ]);
  });
});
