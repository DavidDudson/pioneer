import { describe, expect, test } from 'bun:test';

import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import {
  ActivationName,
  ContentId,
  FrequencyPeriod,
  HitPoints,
  RuleSlug,
  Slug,
  SlotCount,
  SpellRank,
} from '@pioneer/rules/sdk';
import type { Activation, Frequency, Uses } from '@pioneer/rules/sdk';

import {
  abilityUseKey,
  activationMaxima,
  activationUseKey,
  Boundary,
  frequencyBoundary,
  heldCount,
  NO_COUNTED,
  slotCountKey,
  slotMaxima,
  useMaxima,
} from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { InventoryItemId, InventoryItemSchema } from './inventory';
import type { InventoryItem } from './inventory';
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
const BLAST_USE = abilityUseKey(BLAST);
const OTHER_USE = abilityUseKey(OTHER);

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
    expect([...COUNTED.uses.keys()]).toStrictEqual([BLAST_USE]);
    expect(COUNTED.uses.get(BLAST_USE)?.max).toBe(count(2));
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
    const spent = applied(FRESH_PLAY, { field: PlayCommandField.SpendUse, use: BLAST_USE });
    expect(spent.resources.uses[BLAST_USE]).toBe(count(1));
    const refunded = applied(spent, { field: PlayCommandField.RefundUse, use: BLAST_USE });
    expect(refunded.resources.uses[BLAST_USE]).toBe(count(0));
    expect(applied(FRESH_PLAY, { field: PlayCommandField.SpendUse, use: OTHER_USE })).toStrictEqual(FRESH_PLAY);
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

function line(id: InventoryItemId, item: ContentId, quantity: number): InventoryItem {
  return InventoryItemSchema.parse({ id, item, quantity });
}

describe('activation maxima', () => {
  const WINGED = ContentId.parse('00000000-0000-4000-8000-000000000003');
  const PLAIN = ContentId.parse('00000000-0000-4000-8000-000000000004');
  const SKIES = Slug.parse('take-to-the-skies');
  const FIRST_WINGED = InventoryItemId.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const SECOND_WINGED = InventoryItemId.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  const activations = (id: ContentId): readonly Activation[] =>
    id === WINGED
      ? [
          {
            slug: SKIES,
            name: ActivationName.parse('Take to the Skies'),
            frequency: frequency(1, FrequencyPeriod.Hour),
          },
        ]
      : [];
  const maxima = activationMaxima(
    [
      line(FIRST_WINGED, WINGED, 1),
      line(SECOND_WINGED, WINGED, 2),
      line(InventoryItemId.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc'), PLAIN, 1),
    ],
    activations,
  );

  test('each inventory line has its own uses, and an item with no activation has none', () => {
    expect([...maxima.keys()]).toStrictEqual([
      activationUseKey(FIRST_WINGED, SKIES),
      activationUseKey(SECOND_WINGED, SKIES),
    ]);
  });

  test('a line of several items has a use of each per period, on the boundary of its frequency', () => {
    expect(maxima.get(activationUseKey(SECOND_WINGED, SKIES))).toStrictEqual({
      max: count(2),
      boundary: Boundary.Rest,
    });
  });

  test('uses are spent and refunded within the maximum', () => {
    const limits = within(HP, undefined, { slots: new Map(), uses: maxima });
    const use = activationUseKey(FIRST_WINGED, SKIES);
    const spent = (play: PlayState): PlayState =>
      applyPlayCommand(play, { field: PlayCommandField.SpendUse, use }, limits);
    expect(spent(spent(FRESH_PLAY)).resources.uses[use]).toBe(count(1));
    const back = applyPlayCommand(spent(FRESH_PLAY), { field: PlayCommandField.RefundUse, use }, limits);
    expect(back.resources.uses[use]).toBe(count(0));
  });
});
