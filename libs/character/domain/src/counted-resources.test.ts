import { describe, expect, test } from 'bun:test';

import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { ContentId, FrequencyPeriod, HitPoints, RuleSlug, Slug, SlotCount, SpellRank } from '@pioneer/rules/sdk';
import type { Frequency, Uses } from '@pioneer/rules/sdk';

import {
  Boundary,
  frequencyBoundary,
  heldCount,
  NO_COUNTED,
  slotCountKey,
  slotMaxima,
  useMaxima,
} from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { FRESH_PLAY, PlayCommandField, applyPlayCommand } from './play-state';
import type { PlayCommand, PlayState } from './play-state';
import { ResourceCount } from './resource-count';
import { within } from './testing';

function count(value: number): ResourceCount {
  return ResourceCount.parse(value);
}

const HP = HitPoints.parse(20);
const WIZARD = Slug.parse('wizard');
const FONT = RuleSlug.parse('divine-font');
const FIRST = SpellRank.parse(1);
const SECOND = SpellRank.parse(2);
const BLAST = ContentId.parse('00000000-0000-4000-8000-000000000001');
const OTHER = ContentId.parse('00000000-0000-4000-8000-000000000002');

function frequency(max: number, per: FrequencyPeriod): Frequency {
  return { max: max as Uses, per };
}

/** A wizard with two first-rank and one second-rank slot, and a font pool of three first-rank slots. */
function wizard(): SpellcastingInPlay {
  const slots = {
    ranks: [
      { rank: FIRST, count: SlotCount.parse(2) },
      { rank: SECOND, count: SlotCount.parse(1) },
    ],
  };
  const pool = { pool: FONT, ranks: [{ rank: FIRST, count: SlotCount.parse(3) }] };
  return { slug: WIZARD, slots, pools: [pool] } as unknown as SpellcastingInPlay;
}

const COUNTED: CountedMaxima = {
  slots: slotMaxima([wizard()]),
  uses: useMaxima([BLAST, OTHER], (id) => (id === BLAST ? frequency(2, FrequencyPeriod.Day) : undefined)),
};
const LIMITS = within(HP, undefined, COUNTED);
const FIRST_SLOT = slotCountKey(WIZARD, undefined, FIRST);

function applied(play: PlayState, command: PlayCommand): PlayState {
  return applyPlayCommand(play, command, LIMITS);
}

function spendSlot(play: PlayState, times: number): PlayState {
  let next = play;
  for (let each = 0; each < times; each += 1) {
    next = applied(next, { field: PlayCommandField.SpendSlot, slot: FIRST_SLOT });
  }
  return next;
}

describe('slot maxima', () => {
  test('one per rank of the entry and of each pool, on the day boundary, with no cantrips', () => {
    expect(COUNTED.slots.get(FIRST_SLOT)).toStrictEqual({ max: ResourceCount.parse(2), boundary: Boundary.Day });
    expect(COUNTED.slots.get(slotCountKey(WIZARD, undefined, SECOND))?.max).toBe(count(1));
    expect(COUNTED.slots.get(slotCountKey(WIZARD, FONT, FIRST))?.max).toBe(count(3));
    expect(COUNTED.slots.size).toBe(count(3));
  });
});

describe('use maxima', () => {
  test('only abilities with a frequency are counted, with the frequency as the maximum', () => {
    expect([...COUNTED.uses.keys()]).toStrictEqual([BLAST]);
    expect(COUNTED.uses.get(BLAST)?.max).toBe(count(2));
  });

  test('a frequency names the boundary its uses come back on', () => {
    const boundaries = Object.values(FrequencyPeriod).map((per) => frequencyBoundary(frequency(1, per)));
    expect(boundaries).toStrictEqual([
      Boundary.Turn,
      Boundary.Round,
      Boundary.Rest,
      Boundary.Rest,
      Boundary.Rest,
      Boundary.Manual,
      Boundary.Day,
      Boundary.Manual,
      Boundary.Manual,
      Boundary.Manual,
    ]);
  });
});

describe('spending slots and uses', () => {
  test('a slot spent is held one less, and a refund gives it back', () => {
    const spent = spendSlot(FRESH_PLAY, 1);
    const held = (play: PlayState): number =>
      heldCount({ spent: play.resources.slots, maxima: COUNTED.slots, key: FIRST_SLOT });
    expect(held(FRESH_PLAY)).toBe(count(2));
    expect(held(spent)).toBe(count(1));
    const refunded = applied(spent, { field: PlayCommandField.RefundSlot, slot: FIRST_SLOT });
    expect(held(refunded)).toBe(count(2));
  });

  test('spending past none held and refunding past the maximum change nothing more', () => {
    const empty = spendSlot(FRESH_PLAY, 5);
    expect(empty.resources.slots[FIRST_SLOT]).toBe(count(2));
    const full = applied(FRESH_PLAY, { field: PlayCommandField.RefundSlot, slot: FIRST_SLOT });
    expect(full.resources.slots[FIRST_SLOT]).toBe(count(0));
  });

  test('a slot the build does not give is left alone', () => {
    const unknown = slotCountKey(WIZARD, undefined, SpellRank.parse(9));
    const next = applied(FRESH_PLAY, { field: PlayCommandField.SpendSlot, slot: unknown });
    expect(next).toStrictEqual(FRESH_PLAY);
  });

  test('uses are spent and refunded the same way, and one without a frequency is refused', () => {
    const spent = applied(FRESH_PLAY, { field: PlayCommandField.SpendUse, use: BLAST });
    expect(spent.resources.uses[BLAST]).toBe(count(1));
    const refunded = applied(spent, { field: PlayCommandField.RefundUse, use: BLAST });
    expect(refunded.resources.uses[BLAST]).toBe(count(0));
    expect(applied(FRESH_PLAY, { field: PlayCommandField.SpendUse, use: OTHER })).toStrictEqual(FRESH_PLAY);
  });

  test('with no slots or uses given, nothing is spent', () => {
    const next = applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.SpendSlot, slot: FIRST_SLOT },
      within(HP, undefined, NO_COUNTED),
    );
    expect(next).toStrictEqual(FRESH_PLAY);
  });
});
