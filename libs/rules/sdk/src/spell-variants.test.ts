import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, EntrySlug, PackId } from './content-id';
import { RulesMessage } from './messages';

function issues(value: unknown): readonly FieldIssue[] {
  const result = ContentEntry.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const PACK = 'player-core';
const SLUG = 'spell:heal';

/** Heal, with `data` laid over its own. */
function heal(data: object): object {
  return {
    id: contentId(PackId.parse(PACK), EntrySlug.parse(SLUG)),
    pack: PACK,
    slug: SLUG,
    name: 'Heal',
    rarity: 'common',
    traits: ['healing', 'manipulate', 'vitality'],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Heal' }] }],
    rules: [],
    kind: 'spell',
    data: {
      rank: 1,
      traditions: ['divine', 'primal'],
      time: { type: 'actions', cost: 'two' },
      damage: [{ key: '0', formula: '1d8', damageType: 'vitality', kinds: ['damage', 'healing'] }],
      ...data,
    },
  };
}

function withVariants(variants: readonly object[]): object {
  return heal({ variants });
}

describe('spell variants', () => {
  test('a variant changes something, and may be named', () => {
    const oneAction = { name: 'One action', time: { type: 'actions', cost: 'one' } };

    expect(issues(withVariants([oneAction]))).toStrictEqual([]);
    expect(issues(withVariants([{ name: 'Nothing' }]))).toStrictEqual([
      { path: ['data', 'variants', 0], message: message(RulesMessage.SpellVariantEmpty) },
    ]);
  });

  test('a variant is heightened by the damage it has', () => {
    const splash = { key: 'splash', formula: '1d6', kinds: ['damage'] };
    const heightening = { type: 'interval', interval: 1, damage: [{ key: '0', formula: '1d6' }] };

    expect(issues(withVariants([{ damage: [splash], heightening }]))).toStrictEqual([
      {
        path: ['data', 'variants', 0, 'heightening', 'damage', 0, 'key'],
        message: message(RulesMessage.SpellDamageKey, { key: '0' }),
      },
    ]);
    expect(issues(withVariants([{ heightening }]))).toStrictEqual([]);
  });

  test('fixed heightening may change the casting time and traits', () => {
    const rank = { rank: 5, time: { type: 'actions', cost: 'three' }, traits: ['concentrate', 'manipulate'] };

    expect(issues(heal({ heightening: { type: 'fixed', ranks: [rank] } }))).toStrictEqual([]);
  });

  test("a variant's fixed heightening is above the spell's rank", () => {
    const heightening = { type: 'fixed', ranks: [{ rank: 1, time: { type: 'actions', cost: 'three' } }] };

    expect(issues(withVariants([{ heightening }])).map((issue) => issue.path.join('.'))).toStrictEqual([
      'data.variants.0.heightening.ranks.0.rank',
    ]);
  });

  test('the variants are a list that is not empty', () => {
    expect(issues(withVariants([])).map((issue) => issue.path.join('.'))).toStrictEqual(['data.variants']);
  });
});
