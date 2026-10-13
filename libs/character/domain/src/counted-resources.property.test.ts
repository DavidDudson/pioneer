import { describe, expect, test } from 'bun:test';

import { ContentId, HitPoints, Slug, SpellRank } from '@pioneer/rules/sdk';
import { array, assert, constantFrom, integer, property } from 'fast-check';

import { abilityUseKey, activationUseKey, Boundary, heldCount, slotCountKey } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { InventoryItemId } from './inventory';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayCommand } from './play-state';
import { ResourceCount } from './resource-count';
import { within } from './testing';

const COMMANDS_MAX = 40;
const MAXIMUM_MAX = 6;
const ENTRY = Slug.parse('wizard');
const SLOT = slotCountKey(ENTRY, undefined, SpellRank.parse(1));
const USE = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-000000000001'));
const ITEM_USE = activationUseKey(
  InventoryItemId.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  Slug.parse('take-to-the-skies'),
);
const USES = [USE, ITEM_USE] as const;

const FIELDS = [
  PlayCommandField.SpendSlot,
  PlayCommandField.RefundSlot,
  PlayCommandField.SpendUse,
  PlayCommandField.RefundUse,
] as const;

function commandOf(field: (typeof FIELDS)[number], use: (typeof USES)[number]): PlayCommand {
  if (field === PlayCommandField.SpendSlot || field === PlayCommandField.RefundSlot) {
    return { field, slot: SLOT };
  }
  return { field, use };
}

/** Runs `fields` as commands against slots and uses of at most `max`, checking the counts after each. */
function runWithin(max: number, fields: readonly (typeof FIELDS)[number][]): void {
  const maximum = { max: ResourceCount.parse(max), boundary: Boundary.Day };
  const counted: CountedMaxima = {
    slots: new Map([[SLOT, maximum]]),
    uses: new Map(USES.map((use) => [use, maximum])),
  };
  const limits = within(HitPoints.parse(1), undefined, counted);
  let play = FRESH_PLAY;
  for (const field of fields) {
    for (const use of USES) {
      play = applyPlayCommand(play, commandOf(field, use), limits);
      expect(play.resources.uses[use] ?? 0).toBeLessThanOrEqual(max);
    }
    const held = heldCount({ spent: play.resources.slots, maxima: counted.slots, key: SLOT });
    expect(play.resources.slots[SLOT] ?? 0).toBeLessThanOrEqual(max);
    expect(held).toBeLessThanOrEqual(max);
  }
}

describe('slots and uses spent', () => {
  test('stay within 0 and the maximum for any sequence of spends and refunds', () => {
    const maxima = integer({ min: 0, max: MAXIMUM_MAX });
    const sequences = array(constantFrom(...FIELDS), { maxLength: COMMANDS_MAX });
    assert(property(maxima, sequences, runWithin));
  });
});
