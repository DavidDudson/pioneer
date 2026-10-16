import { describe, expect, test } from 'bun:test';

import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { Origin, SpellPreparation } from '@pioneer/rules/sdk';

import { CharacterLevel } from './character-fields';
import { CountDelta, slotCountKey, slotMaxima, spentAfter } from './counted-resources';
import type { CountedMaxima, SlotCountKey } from './counted-resources';
import { InventoryItemId, InventoryItemSchema, ItemQuantity } from './inventory';
import type { ResourceCount } from './resource-count';
import { ResourcesSpentSchema } from './resources';
import type { ResourcesSpent } from './resources';
import { spellContent } from './spell-content';
import { chargesHeld, StaffChargesSchema } from './staff-charges';
import {
  StaffCastProblem,
  StaffCommandField,
  staffCantripRank,
  staffCastCost,
  staffCastOptions,
  staffCastProblem,
  staffResourcesAfter,
} from './staff-commands';
import type { StaffCommand, StaffSlots } from './staff-commands';
import { staffSources } from './staff-sources';
import type { StaffSource } from './staff-sources';
import { ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry, staffSpellId } from './testing';

const items = itemFixtureContent();
const spells = spellContent(itemFixtureRegistry());

const ORIGIN = Origin.parse({
  hops: [],
  entry: staffSpellId('ignition'),
  sources: [{ kind: 'web', url: 'https://example.com/' }],
});

const STAFF_ID = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const HELD = { state: 'held', hands: 1 } as const;
const SPEND = CountDelta.parse(1);

const CANTRIP = staffSpellId('ignition');
const FIRST = staffSpellId('breathe-fire');
const THIRD = staffSpellId('fireball');

/** An entry that casts from `ranks`, one slot each, of the arcane tradition. */
interface EntryShape {
  readonly slug: string;
  readonly preparation: SpellPreparation;
  readonly ranks: readonly number[];
  readonly tradition?: 'arcane' | 'primal';
}

function entry({ slug, preparation, ranks, tradition = 'arcane' }: EntryShape): SpellcastingInPlay {
  return {
    slug,
    tradition,
    attribute: 'cha',
    preparation,
    origin: ORIGIN,
    slots: { ranks: ranks.map((rank) => ({ rank, count: 1 })) },
    pools: [],
    signatures: false,
    focusSpells: [],
    deitySpells: false,
  } as unknown as SpellcastingInPlay;
}

const SORCERER = entry({ slug: 'sorcerer', preparation: SpellPreparation.Spontaneous, ranks: [1, 2, 3, 4] });
const WIZARD = entry({ slug: 'wizard', preparation: SpellPreparation.Prepared, ranks: [1, 2, 3, 4] });

/** What a character with `entries` has: the staff prepared with `max` charges (none when undefined), and the slots counted. */
interface Table {
  readonly entries: readonly SpellcastingInPlay[];
  readonly counted: CountedMaxima;
  readonly resources: ResourcesSpent;
}

function table(entries: readonly SpellcastingInPlay[], max: number | undefined): Table {
  const charges = StaffChargesSchema.parse(max === undefined ? {} : { [STAFF_ID]: { max, spent: 0 } });
  return {
    entries,
    counted: { slots: slotMaxima(entries), uses: new Map() },
    resources: ResourcesSpentSchema.parse({ staff: charges }),
  };
}

/** The staff as the table has it now: its charges are those the resources hold. */
function sourceOf({ entries, resources }: Table): StaffSource {
  const inventory = InventoryItemSchema.parse({
    id: STAFF_ID,
    item: itemFixtureId(ItemFixture.FireStaff),
    quantity: ItemQuantity.parse(1),
    carry: HELD,
  });
  const [source] = staffSources({ inventory: [inventory], items, spells, entries, charges: resources.staff });
  if (source === undefined) {
    throw new TypeError('The fixture staff is a source');
  }
  return source;
}

function slotsOf({ counted, resources }: Table): StaffSlots {
  return { spent: resources.slots, maxima: counted.slots };
}

function command(
  spell: typeof CANTRIP,
  slotRank?: number,
  field: StaffCommand['field'] = StaffCommandField.CastStaff,
): StaffCommand {
  const base = { field, item: STAFF_ID, spell };
  return slotRank === undefined ? base : { ...base, slot: slotCountKey(SORCERER.slug, undefined, slotRank) };
}

function cast(spell: typeof CANTRIP, slotRank?: number): StaffCommand {
  return command(spell, slotRank);
}

function uncast(spell: typeof CANTRIP, slotRank?: number): StaffCommand {
  return command(spell, slotRank, StaffCommandField.UncastStaff);
}

function problemOf(at: Table, edit: StaffCommand): StaffCastProblem | undefined {
  return staffCastProblem(edit, sourceOf(at), slotsOf(at));
}

function costOf(at: Table, edit: StaffCommand): ResourceCount {
  const spell = sourceOf(at).spells.find(({ id }) => id === edit.spell);
  if (spell === undefined) {
    throw new TypeError('The fixture staff holds the spell');
  }
  return staffCastCost(edit, spell);
}

function apply(at: Table, edit: StaffCommand): Table {
  const { resources, counted } = at;
  return { ...at, resources: staffResourcesAfter({ resources, counted, command: edit, cost: costOf(at, edit) }) };
}

function chargesLeft({ resources }: Table): number {
  return chargesHeld(resources.staff, STAFF_ID);
}

function optionsFor(at: Table, spell: typeof CANTRIP): readonly StaffCommand[] {
  return staffCastOptions(sourceOf(at), spell, slotsOf(at));
}

function slotOf(rank: number): SlotCountKey {
  return slotCountKey(SORCERER.slug, undefined, rank);
}

describe('a staff cast', () => {
  test('costs charges equal to the spell rank', () => {
    const at = table([WIZARD], 4);
    expect(problemOf(at, cast(THIRD))).toBeUndefined();
    expect(costOf(at, cast(THIRD))).toBe(3);
    const spent = apply(at, cast(THIRD));
    expect(chargesLeft(spent)).toBe(1);
  });

  test('costs a cantrip nothing, even from a staff that is not prepared', () => {
    const at = table([WIZARD], undefined);
    expect(problemOf(at, cast(CANTRIP))).toBeUndefined();
    expect(costOf(at, cast(CANTRIP))).toBe(0);
    expect(apply(at, cast(CANTRIP)).resources).toEqual(at.resources);
  });

  test('is refused when the staff has too few charges', () => {
    expect(problemOf(table([WIZARD], 2), cast(THIRD))).toBe(StaffCastProblem.TooFewCharges);
  });

  test('is refused when the staff is not the one prepared', () => {
    expect(problemOf(table([WIZARD], undefined), cast(FIRST))).toBe(StaffCastProblem.NotPrepared);
  });

  test('is refused for a spell no list of the holder has, with the reason', () => {
    const druid = entry({
      slug: 'druid',
      preparation: SpellPreparation.Prepared,
      ranks: [1, 2, 3],
      tradition: 'primal',
    });
    expect(problemOf(table([druid], 4), cast(CANTRIP))).toBe(StaffCastProblem.NotOnList);
  });

  test('is refused for a spell above the ranks the holder casts, with the reason', () => {
    const low = entry({ slug: 'wizard', preparation: SpellPreparation.Prepared, ranks: [1, 2] });
    expect(problemOf(table([low], 4), cast(THIRD))).toBe(StaffCastProblem.RankTooHigh);
  });

  test('is refused for a spell the staff does not hold', () => {
    const heal = cast(staffSpellId('heal'));
    expect(problemOf(table([WIZARD], 4), heal)).toBe(StaffCastProblem.NotOnStaff);
  });

  test('is refused for an item that is no staff', () => {
    const at = table([WIZARD], 4);
    expect(staffCastProblem(cast(FIRST), undefined, slotsOf(at))).toBe(StaffCastProblem.NotHeld);
  });
});

describe('a staff cast paid with a slot', () => {
  test('costs 1 charge and a slot of the spell rank or higher from a spontaneous caster', () => {
    const at = table([SORCERER], 4);
    expect(problemOf(at, cast(THIRD, 3))).toBeUndefined();
    expect(problemOf(at, cast(THIRD, 4))).toBeUndefined();
    const after = apply(at, cast(THIRD, 4));
    expect(chargesLeft(after)).toBe(3);
    expect(after.resources.slots[slotOf(4)]).toBe(1);
  });

  test('is refused with a slot below the spell rank', () => {
    expect(problemOf(table([SORCERER], 4), cast(THIRD, 2))).toBe(StaffCastProblem.SlotNotAllowed);
  });

  test('is refused for a prepared caster, who expends a slot at daily preparations instead', () => {
    const slot = slotCountKey(WIZARD.slug, undefined, 3);
    expect(problemOf(table([WIZARD], 4), { ...cast(THIRD), slot })).toBe(StaffCastProblem.SlotNotAllowed);
  });

  test('is refused for a cantrip, which costs nothing to pay for', () => {
    expect(problemOf(table([SORCERER], 4), cast(CANTRIP, 1))).toBe(StaffCastProblem.SlotNotAllowed);
  });

  test('is refused once the slot is spent, so a slot is never spent twice', () => {
    const once = apply(table([SORCERER], 4), cast(THIRD, 3));
    expect(problemOf(once, cast(THIRD, 3))).toBe(StaffCastProblem.NoSlotLeft);
  });

  test('is refused when the staff has no charge left, even with a slot', () => {
    expect(problemOf(table([SORCERER], 0), cast(THIRD, 3))).toBe(StaffCastProblem.TooFewCharges);
  });
});

describe('taking a staff cast back', () => {
  test('refunds the charges', () => {
    const spent = apply(table([WIZARD], 4), cast(THIRD));
    expect(problemOf(spent, uncast(THIRD))).toBeUndefined();
    const refunded = apply(spent, uncast(THIRD));
    expect(chargesLeft(refunded)).toBe(4);
  });

  test('refunds the charge and the slot together', () => {
    const at = table([SORCERER], 4);
    const paid = apply(at, cast(THIRD, 3));
    const back = apply(paid, uncast(THIRD, 3)).resources;
    expect(back.staff).toEqual(at.resources.staff);
    expect(back.slots).toEqual({ [slotOf(3)]: 0 });
  });

  test('is refused when nothing was spent to refund', () => {
    const at = table([SORCERER], 4);
    expect(problemOf(at, uncast(THIRD))).toBe(StaffCastProblem.NothingToRefund);
    expect(problemOf(at, uncast(THIRD, 3))).toBe(StaffCastProblem.NothingToRefund);
  });

  test('lets a cantrip be taken back, since it spent nothing', () => {
    expect(problemOf(table([WIZARD], undefined), uncast(CANTRIP))).toBeUndefined();
  });

  test('keeps the slot count spent in step with spentAfter', () => {
    const at = table([SORCERER], 4);
    const direct = spentAfter({ spent: at.resources.slots, maxima: at.counted.slots, key: slotOf(3) }, SPEND);
    expect(apply(at, cast(THIRD, 3)).resources.slots).toEqual(direct);
  });
});

describe('staffCastOptions', () => {
  test('offers the charges alone to a prepared caster', () => {
    expect(optionsFor(table([WIZARD], 4), THIRD)).toEqual([cast(THIRD)]);
  });

  test('offers a spontaneous caster the charges and each slot of the rank or higher', () => {
    const slots = optionsFor(table([SORCERER], 4), THIRD).map(({ slot }) => slot);
    expect(slots).toEqual([undefined, slotOf(3), slotOf(4)]);
  });

  test('leaves out what the staff cannot pay for', () => {
    expect(optionsFor(table([SORCERER], 2), THIRD).map(({ slot }) => slot)).toEqual([slotOf(3), slotOf(4)]);
    expect(optionsFor(table([SORCERER], 0), THIRD)).toEqual([]);
  });

  test('offers a cantrip once, without a slot', () => {
    expect(optionsFor(table([SORCERER], undefined), CANTRIP)).toEqual([cast(CANTRIP)]);
  });
});

describe('staffCantripRank', () => {
  test('is half the level rounded up, at least 1st', () => {
    const levels = [1, 2, 5, 10, 20].map((level) => CharacterLevel.parse(level));
    expect(levels.map((level) => staffCantripRank(level))).toEqual([1, 1, 3, 5, 10]);
  });
});
