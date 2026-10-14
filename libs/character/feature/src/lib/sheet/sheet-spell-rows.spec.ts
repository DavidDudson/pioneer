import type { SpellOption } from '@pioneer/character/domain';
import {
  AreaValue,
  CastActions,
  ContentId,
  ContentText,
  DefenseValue,
  DurationValue,
  MagicTradition,
  RangeBand,
  Rarity,
  SpellRank,
  TargetValue,
} from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { spellRows } from './sheet-spell-rows';

const SPARK = ContentId.parse('00000000-0000-4000-8000-000000000001');
const FIREBALL = ContentId.parse('00000000-0000-4000-8000-000000000002');

interface Facts {
  readonly rank: number;
  readonly cantrip?: boolean;
}

function spell(id: ContentId, name: string, { rank, cantrip = false }: Facts): SpellOption {
  return {
    id,
    name: ContentText.parse(name),
    rank: SpellRank.parse(rank),
    traditions: [MagicTradition.Arcane],
    rarity: Rarity.Common,
    cantrip,
    focus: false,
    cast: [CastActions.Two],
    range: [RangeBand.UpTo30],
    area: AreaValue.None,
    targets: [TargetValue.Single],
    defense: [DefenseValue.None],
    duration: [DurationValue.Instant],
    traits: [],
    sources: [],
  };
}

const translate = (key: string): string => key;
const NONE = new Set<ContentId>();

describe(spellRows, () => {
  it('carries the facts a player chooses by', () => {
    const [row] = spellRows([spell(FIREBALL, 'Fireball', { rank: 3 })], {
      translate,
      castRank: SpellRank.parse(3),
      taken: NONE,
    });
    expect(row).toMatchObject({
      id: FIREBALL,
      name: 'Fireball',
      rank: 3,
      cantrip: false,
      cast: [CastActions.Two],
      range: [RangeBand.UpTo30],
      disabledReason: undefined,
    });
  });

  it('says the rank a slot heightens a cantrip to, and a spell it casts above its own rank', () => {
    const rows = spellRows(
      [spell(SPARK, 'Spark', { rank: 1, cantrip: true }), spell(FIREBALL, 'Fireball', { rank: 3 })],
      {
        translate,
        castRank: SpellRank.parse(4),
        taken: NONE,
      },
    );
    expect(rows.map((row) => row.heightenedTo)).toStrictEqual([4, 4]);
  });

  it('says nothing of heightening for a spell cast at its own rank or where a slot casts at a range of ranks', () => {
    const own = spellRows([spell(FIREBALL, 'Fireball', { rank: 3 })], {
      translate,
      castRank: SpellRank.parse(3),
      taken: NONE,
    });
    const range = spellRows([spell(FIREBALL, 'Fireball', { rank: 3 })], {
      translate,
      castRank: undefined,
      taken: NONE,
    });
    expect([own[0]?.heightenedTo, range[0]?.heightenedTo]).toStrictEqual([undefined, undefined]);
  });

  it('disables a spell the entry holds in another slot, with the reason', () => {
    const rows = spellRows([spell(SPARK, 'Spark', { rank: 1 }), spell(FIREBALL, 'Fireball', { rank: 3 })], {
      translate,
      castRank: undefined,
      taken: new Set([FIREBALL]),
    });
    expect(rows.map((row) => row.disabledReason)).toStrictEqual([undefined, 'character.sheet.prepared.alreadyKnown']);
  });
});
