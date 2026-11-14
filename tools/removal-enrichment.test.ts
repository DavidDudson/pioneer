import { describe, expect, test } from 'bun:test';

import {
  ConditionRemoval,
  ContentEntryFile,
  ContentId,
  contentId,
  contentKey,
  EntrySlug,
  PackId,
} from '@pioneer/rules/sdk';
import type { ContentKey } from '@pioneer/rules/sdk';

import { enrichRemovalFile, removalMatches } from './removal-enrichment.ts';

const PACK = PackId.parse('player-core');
const prose = (words: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** The id and key an entry of the test pack has. */
function idOf(slug: string): ContentId {
  return ContentId.parse(contentId(PACK, EntrySlug.parse(slug)));
}

/** The key of an entry of the test pack. */
function keyOf(slug: string): ContentKey {
  return contentKey(PACK, EntrySlug.parse(slug));
}

/** A Player Core entry's JSON, as a pack file holds it. */
function entry(slug: string, kind: string, data: object): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    kind,
    name: slug,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: prose(slug),
    rules: [],
    ...(kind === 'action' ? {} : { level: 1 }),
    data,
  };
}

/** A condition that names `by` as easing it. */
function condition(slug: string, by: readonly string[]): object {
  return entry(slug, 'condition', {
    valued: true,
    overrides: [],
    implies: [],
    recovery: [{ kind: 'others', by: by.map((slug_) => idOf(slug_)), text: prose('Eased.') }],
  });
}

const FRIGHTENED = 'condition:frightened';
const SICKENED = 'condition:sickened';

describe('removal enrichment', () => {
  test('puts each condition on the entries that ease it, with what they do to it', () => {
    const file = [
      condition(FRIGHTENED, ['feat:dwarven-doughtiness', 'feat:legendary-medic']),
      condition(SICKENED, ['feat:legendary-medic']),
      entry('feat:dwarven-doughtiness', 'feat', { category: 'ancestry' }),
      entry('feat:legendary-medic', 'feat', { category: 'skill' }),
    ];

    const { removals, unmapped } = removalMatches(ContentEntryFile.parse(file));

    expect(unmapped).toStrictEqual([]);
    expect(removals.get(keyOf('feat:dwarven-doughtiness'))).toStrictEqual([
      ConditionRemoval.parse({ condition: idOf(FRIGHTENED), effect: 'lower', by: 2 }),
    ]);
    expect(removals.get(keyOf('feat:legendary-medic'))).toStrictEqual([
      ConditionRemoval.parse({ condition: idOf(FRIGHTENED), effect: 'remove' }),
      ConditionRemoval.parse({ condition: idOf(SICKENED), effect: 'remove' }),
    ]);
  });

  test('lists an entry a condition names that the table does not describe', () => {
    const file = [condition(FRIGHTENED, ['feat:unheard-of']), entry('feat:unheard-of', 'feat', { category: 'class' })];

    const { removals, unmapped } = removalMatches(ContentEntryFile.parse(file));

    expect(removals.size).toBe(0);
    expect(unmapped).toStrictEqual([EntrySlug.parse('feat:unheard-of')]);
  });

  test('sets removesConditions on the entry and leaves the rest of the file as it was', () => {
    const medic = entry('feat:legendary-medic', 'feat', { category: 'skill' });
    const other = entry('feat:other', 'feat', { category: 'class' });
    const file = [condition(FRIGHTENED, ['feat:legendary-medic']), medic, other];
    const { removals } = removalMatches(ContentEntryFile.parse(file));

    const enriched = enrichRemovalFile(file, removals);

    expect(enriched?.[0]).toBe(file[0]);
    expect(enriched?.[2]).toBe(other);
    expect(enriched?.[1]).toStrictEqual(
      entry('feat:legendary-medic', 'feat', {
        category: 'skill',
        removesConditions: [{ condition: idOf(FRIGHTENED), effect: 'remove' }],
      }),
    );
    expect(enrichRemovalFile([other], removals)).toBeUndefined();
  });
});
