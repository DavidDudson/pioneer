import { describe, expect, test } from 'bun:test';

import { BookId } from '@pioneer/rules/sdk';

import { readFoundryRelease } from './foundry-release';
import type { FoundryRelease } from './foundry-release';
import { LEGACY_ENTRY_BOOKS } from './ogl-entries';
import { selectEntries, SkipReason } from './select-entries';

const ROOT = 'pf2e-pf2e-8.6.0';
const guide = BookId.parse('advanced-players-guide');

const manifest = {
  packs: [{ name: 'feats-srd', path: 'packs/feats', type: 'Item' }],
  languages: [{ lang: 'en', name: 'Main (English)', path: 'lang/en.json' }],
};

/** A feat of the Advanced Player's Guide, which Foundry marks OGL and pre-remaster. */
function feat(name: string): object {
  const publication = { title: "Pathfinder Advanced Player's Guide", license: 'OGL', remaster: false };
  return { _id: `${name}Id`, name, type: 'feat', img: 'icon.webp', system: { publication, rules: [] } };
}

function release(path: string, name: string): FoundryRelease {
  const files = {
    'system.pf2e.json': manifest,
    'static/lang/en.json': { PF2E: {} },
    [`packs/pf2e/feats/skill/${path}`]: feat(name),
  };
  return readFoundryRelease(
    new Map(Object.entries(files).map(([file, json]) => [`${ROOT}/${file}`, JSON.stringify(json)] as const)),
  );
}

describe('an OGL item printed only in a pre-remaster book', () => {
  test('is a legacy-entry book', () => {
    expect(LEGACY_ENTRY_BOOKS.has(guide)).toBe(true);
  });

  test('is kept in its book with no licence of its own, the pack being OGL', () => {
    const { selected } = selectEntries(release('eye-for-numbers.json', 'Eye for Numbers'), new Set([guide]));

    expect(selected.map(({ book, license }) => [book, license])).toEqual([[guide, undefined]]);
  });

  test('leaves the rest of the book out', () => {
    const { selected, skipped } = selectEntries(release('other.json', 'Other Feat'), new Set([guide]));

    expect(selected).toEqual([]);
    expect(skipped.map(({ reason }) => reason)).toEqual([SkipReason.Legacy]);
  });
});
