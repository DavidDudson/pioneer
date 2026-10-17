import { describe, expect, test } from 'bun:test';

import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { Origin, SpellPreparation, SpellRank } from '@pioneer/rules/sdk';
import { array, assert, constantFrom, property } from 'fast-check';

import { slotCountKey, slotMaxima } from './counted-resources';
import { InventoryItemId, InventoryItemSchema, ItemQuantity } from './inventory';
import { ResourcesSpentSchema } from './resources';
import type { ResourcesSpent } from './resources';
import { spellContent } from './spell-content';
import { StaffChargesSchema } from './staff-charges';
import { StaffCommandField, staffCastCost, staffCastProblem, staffResourcesAfter } from './staff-commands';
import type { StaffCommand } from './staff-commands';
import { staffSources } from './staff-sources';
import { ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry, staffSpellId } from './testing';

const items = itemFixtureContent();
const spells = spellContent(itemFixtureRegistry());
const STAFF_ID = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const MAX_CHARGES = 4;
const SLOTS_A_RANK = 1;

const ORIGIN = Origin.parse({
  hops: [],
  entry: staffSpellId('ignition'),
  sources: [{ kind: 'web', url: 'https://example.com/' }],
});

const SORCERER = {
  slug: 'sorcerer',
  tradition: 'arcane',
  attribute: 'cha',
  preparation: SpellPreparation.Spontaneous,
  origin: ORIGIN,
  slots: { ranks: [1, 2, 3, 4].map((rank) => ({ rank, count: SLOTS_A_RANK })) },
  pools: [],
  signatures: false,
  focusSpells: [],
  innateSpells: [],
  deitySpells: false,
} as unknown as SpellcastingInPlay;

const COUNTED = { slots: slotMaxima([SORCERER]), uses: new Map() };

const INVENTORY = InventoryItemSchema.parse({
  id: STAFF_ID,
  item: itemFixtureId(ItemFixture.FireStaff),
  quantity: ItemQuantity.parse(1),
  carry: { state: 'held', hands: 1 },
});

const SPELLS = [staffSpellId('ignition'), staffSpellId('breathe-fire'), staffSpellId('fireball')] as const;
const SLOT_RANKS = [undefined, 1, 2, 3, 4] as const;

/** A staff cast or refund of `spell`, paid with a slot of `rank` when one is given. */
function commandOf({ field, spell }: Pick<StaffCommand, 'field' | 'spell'>, rank: number | undefined): StaffCommand {
  const base = { field, item: STAFF_ID, spell };
  return rank === undefined
    ? base
    : Object.assign(base, { slot: slotCountKey(SORCERER.slug, undefined, SpellRank.parse(rank)) });
}

const COMMANDS = array(
  constantFrom(StaffCommandField.CastStaff, StaffCommandField.UncastStaff).chain((field) =>
    constantFrom(...SPELLS).chain((spell) =>
      constantFrom(...SLOT_RANKS).map((rank): StaffCommand => commandOf({ field, spell }, rank)),
    ),
  ),
  { maxLength: 40 },
);

/** `resources` after each command the staff allows. */
function run(commands: readonly StaffCommand[]): ResourcesSpent {
  let resources = ResourcesSpentSchema.parse({
    staff: StaffChargesSchema.parse({ [STAFF_ID]: { max: MAX_CHARGES, spent: 0 } }),
  });
  for (const command of commands) {
    const [source] = staffSources({
      inventory: [INVENTORY],
      items,
      spells,
      entries: [SORCERER],
      charges: resources.staff,
    });
    const slots = { spent: resources.slots, maxima: COUNTED.slots };
    const spell = source?.spells.find(({ id }) => id === command.spell);
    if (spell !== undefined && staffCastProblem(command, source, slots) === undefined) {
      resources = staffResourcesAfter({ resources, counted: COUNTED, command, cost: staffCastCost(command, spell) });
    }
  }
  return resources;
}

describe('a staff cast (properties)', () => {
  test('never takes the charges below 0 or past what the staff holds', () => {
    assert(
      property(COMMANDS, (commands) => {
        const spent = run(commands).staff[STAFF_ID]?.spent ?? 0;
        expect(spent).toBeGreaterThanOrEqual(0);
        expect(spent).toBeLessThanOrEqual(MAX_CHARGES);
      }),
    );
  });

  test('never spends a slot twice', () => {
    assert(
      property(COMMANDS, (commands) => {
        for (const spent of Object.values(run(commands).slots)) {
          expect(spent).toBeLessThanOrEqual(SLOTS_A_RANK);
        }
      }),
    );
  });
});
