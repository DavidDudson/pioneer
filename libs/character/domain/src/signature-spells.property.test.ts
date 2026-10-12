import { describe, expect, test } from 'bun:test';

import { SPELL_RANK_MAX, SpellRank } from '@pioneer/rules/sdk';
import { assert, boolean, integer, property } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { castRanks } from './signature-spells';

const spellRanks: Arbitrary<SpellRank> = integer({ min: 1, max: SPELL_RANK_MAX }).map((rank) => SpellRank.parse(rank));

/** A spell's own rank, a rank it was learned at no lower, and an entry's highest rank. */
const placed = spellRanks.chain((own) =>
  integer({ min: own, max: SPELL_RANK_MAX }).map((learned) => [own, SpellRank.parse(learned)] as const),
);

describe('castRanks (properties)', () => {
  test('a spell is always cast at the rank it was learned', () => {
    assert(
      property(placed, spellRanks, boolean(), ([own, learned], highest, signature) => {
        expect(castRanks({ own, learned, signature, highest })).toContain(learned);
      }),
    );
  });

  test('a signature spell is cast at every rank from its own up to the higher of where it was learned and the highest', () => {
    assert(
      property(placed, spellRanks, ([own, learned], highest) => {
        const cast = castRanks({ own, learned, signature: true, highest });
        const top = Math.max(learned, highest);

        expect(cast.at(0)).toBe(own);
        expect(cast.at(-1)).toBe(SpellRank.parse(top));
        expect(cast).toHaveLength(top - own + 1);
      }),
    );
  });

  test('any other spell is cast only where it was learned', () => {
    assert(
      property(placed, spellRanks, ([own, learned], highest) => {
        expect(castRanks({ own, learned, signature: false, highest })).toStrictEqual([learned]);
      }),
    );
  });
});
