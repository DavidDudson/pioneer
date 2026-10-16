import { ContentId, SpellPreparation, SpellRank, STAFF_CANTRIP } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { CharacterLevel } from './character-fields';
import { CountDelta, heldCount, SlotCountKey, slotCountKey, spentAfter } from './counted-resources';
import type { CountedMaxima, SpentCounts } from './counted-resources';
import { InventoryItemId } from './inventory';
import { ResourceCount } from './resource-count';
import type { ResourcesSpent } from './resources';
import { StaffSpellProblem } from './staff-sources';
import type { StaffSource, StaffSourceSpell } from './staff-sources';

const NONE = ResourceCount.parse(0);
const ONE_CHARGE = ResourceCount.parse(1);
const SPEND = CountDelta.parse(1);
const REFUND = CountDelta.parse(-1);

/** The play edits that cast a spell from a held staff, and take that cast back. */
export const StaffCommandField = {
  /** A spell of a held staff cast, spending its charges or, for a spontaneous caster, 1 charge and a slot. */
  CastStaff: 'castStaff',
  /** A staff cast taken back: the charges and the slot it spent come back. */
  UncastStaff: 'uncastStaff',
} as const;
export type StaffCommandField = ValueOf<typeof StaffCommandField>;

/** The spell cast and what pays for it: the staff's charges alone, or with `slot` also one slot of a spontaneous entry. */
const StaffCastShape = {
  item: InventoryItemId,
  spell: ContentId,
  slot: SlotCountKey.optional(),
};

/** A staff cast as a spend records it: the staff, the spell and how it was paid for, so undoing the spend gives them back. */
export const StaffCastSchema = z.strictObject(StaffCastShape);
export type StaffCast = z.infer<typeof StaffCastSchema>;

export const StaffCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(StaffCommandField.CastStaff), ...StaffCastShape }),
  z.object({ field: z.literal(StaffCommandField.UncastStaff), ...StaffCastShape }),
]);
export type StaffCommand = z.infer<typeof StaffCommandSchema>;

/** Why a staff cast, or taking one back, is refused. */
export const StaffCastProblem = {
  /** The item is no staff the character holds or wears. */
  NotHeld: 'not-held',
  /** The staff does not hold the spell. */
  NotOnStaff: 'not-on-staff',
  /** None of the holder's spell lists has the spell. */
  NotOnList: 'not-on-list',
  /** The holder casts no spell of its rank. */
  RankTooHigh: 'rank-too-high',
  /** The staff is not the one prepared for the day, so it has no charges. */
  NotPrepared: 'not-prepared',
  /** The staff has fewer charges than the cast costs. */
  TooFewCharges: 'too-few-charges',
  /** The slot named is not one the cast may use: not a spontaneous entry's own slot of the spell's rank or higher. */
  SlotNotAllowed: 'slot-not-allowed',
  /** Every slot of that rank is spent. */
  NoSlotLeft: 'no-slot-left',
  /** Taking the cast back would refund more than was spent. */
  NothingToRefund: 'nothing-to-refund',
} as const;
export type StaffCastProblem = ValueOf<typeof StaffCastProblem>;

const SPELL_PROBLEMS = {
  [StaffSpellProblem.NotOnList]: StaffCastProblem.NotOnList,
  [StaffSpellProblem.RankTooHigh]: StaffCastProblem.RankTooHigh,
} as const satisfies Record<StaffSpellProblem, StaffCastProblem>;

/** The slots spent and the most there are, which say whether a slot is left. */
export interface StaffSlots {
  readonly spent: SpentCounts['slots'];
  readonly maxima: CountedMaxima['slots'];
}

/**
 * The charges casting `command` spends: none for a cantrip, 1 when a slot pays the rest, the spell's rank otherwise.
 * The spell is the one the staff lists it as.
 */
export function staffCastCost({ slot }: StaffCommand, { rank, charges }: StaffSourceSpell): ResourceCount {
  if (rank === STAFF_CANTRIP) {
    return NONE;
  }
  return slot === undefined ? ResourceCount.parse(charges) : ONE_CHARGE;
}

/** Whether `slot` is one of the entry that casts the spell, at the spell's rank or higher, and the entry is spontaneous. */
function slotAllowed({ entry, rank }: StaffSourceSpell, slot: SlotCountKey): boolean {
  if (entry === undefined || rank === STAFF_CANTRIP || entry.preparation !== SpellPreparation.Spontaneous) {
    return false;
  }
  return entry.slots.ranks.some((each) => each.rank >= rank && slotCountKey(entry.slug, undefined, each.rank) === slot);
}

/** A cast being checked: the command, the staff it names, what it costs in charges and the slots there are. */
interface CastCheck {
  readonly command: StaffCommand;
  readonly source: StaffSource;
  readonly cost: ResourceCount;
  readonly slots: StaffSlots;
}

/** Why the cast can't be paid for from what the staff and the slots hold, or undefined when it can. */
function paymentProblem({ command, source: { charges }, cost, slots }: CastCheck): StaffCastProblem | undefined {
  if (cost > NONE) {
    if (charges === undefined) {
      return StaffCastProblem.NotPrepared;
    }
    if (charges.left < cost) {
      return StaffCastProblem.TooFewCharges;
    }
  }
  const { slot } = command;
  if (slot !== undefined && heldCount({ ...slots, key: slot }) === NONE) {
    return StaffCastProblem.NoSlotLeft;
  }
  return undefined;
}

/** Why the cast can't be taken back: the charges or the slot it spent are not spent. */
function refundProblem({ command, source: { charges }, cost, slots }: CastCheck): StaffCastProblem | undefined {
  const spent = charges === undefined ? NONE : charges.max - charges.left;
  const { slot } = command;
  const slotSpent = slot === undefined || (slots.spent[slot] ?? NONE) > NONE;
  return spent < cost || !slotSpent ? StaffCastProblem.NothingToRefund : undefined;
}

/** Why `command` can't be made with the staff `source` (undefined when the item is none), or undefined when it can. */
export function staffCastProblem(
  command: StaffCommand,
  source: StaffSource | undefined,
  slots: StaffSlots,
): StaffCastProblem | undefined {
  if (source === undefined) {
    return StaffCastProblem.NotHeld;
  }
  const spell = source.spells.find(({ id }) => id === command.spell);
  if (spell === undefined) {
    return StaffCastProblem.NotOnStaff;
  }
  if (spell.problem !== undefined) {
    return SPELL_PROBLEMS[spell.problem];
  }
  if (command.slot !== undefined && !slotAllowed(spell, command.slot)) {
    return StaffCastProblem.SlotNotAllowed;
  }
  const check: CastCheck = { command, source, cost: staffCastCost(command, spell), slots };
  return command.field === StaffCommandField.CastStaff ? paymentProblem(check) : refundProblem(check);
}

/** What a staff cast, or taking one back, spends or refunds: the command and the charges its spell costs. */
export interface StaffSpend {
  readonly resources: ResourcesSpent;
  readonly counted: CountedMaxima;
  readonly command: StaffCommand;
  readonly cost: ResourceCount;
}

/** The charges spent after `cost` more are spent, or refunded, held within 0 and what the staff holds. */
function chargesSpentAfter(
  known: { readonly max: ResourceCount; readonly spent: ResourceCount },
  cost: ResourceCount,
  casting: boolean,
): ResourceCount {
  const next = casting ? known.spent + cost : known.spent - cost;
  return ResourceCount.parse(Math.min(Math.max(next, 0), known.max));
}

/** The resources after `command` spent, or refunded, `cost` charges and the slot it names; the command must pass `staffCastProblem`. */
export function staffResourcesAfter({ resources, counted, command, cost }: StaffSpend): ResourcesSpent {
  const casting = command.field === StaffCommandField.CastStaff;
  const known = resources.staff[command.item];
  const staff =
    known === undefined || cost === NONE
      ? resources.staff
      : { ...resources.staff, [command.item]: { ...known, spent: chargesSpentAfter(known, cost, casting) } };
  const { slot } = command;
  const slots =
    slot === undefined
      ? resources.slots
      : spentAfter({ spent: resources.slots, maxima: counted.slots, key: slot }, casting ? SPEND : REFUND);
  return { ...resources, staff, slots };
}

/** Whether `command` casts from a staff or takes such a cast back, the play edits that need the staff's content. */
export function isStaffCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, StaffCommand> {
  return Object.values<unknown>(StaffCommandField).includes(command.field);
}

/** `command` paid with `slot` as well as the staff's charge. */
function withSlot(command: StaffCommand, slot: SlotCountKey): StaffCommand {
  return { ...command, slot };
}

/**
 * The ways the player can pay for casting `spell` from `source` now: the spell's charges, and for a spontaneous caster
 * each slot of the spell's rank or higher that is left, each with 1 charge. Empty when the spell can't be cast or paid
 * for. The options are commands, so the sheet previews exactly what the server would accept.
 */
export function staffCastOptions(source: StaffSource, spell: ContentId, slots: StaffSlots): readonly StaffCommand[] {
  const held = source.spells.find(({ id }) => id === spell);
  if (held === undefined) {
    return [];
  }
  const charges: StaffCommand = { field: StaffCommandField.CastStaff, item: source.item.id, spell };
  const { entry, rank } = held;
  const paidWithSlots =
    entry === undefined || rank === STAFF_CANTRIP
      ? []
      : entry.slots.ranks
          .filter((each) => each.rank >= rank)
          .map((each): StaffCommand => withSlot(charges, slotCountKey(entry.slug, undefined, each.rank)));
  return [charges, ...paidWithSlots].filter((option) => staffCastProblem(option, source, slots) === undefined);
}

/** A cantrip is heightened to half the character's level, rounded up. */
const CANTRIP_LEVELS_A_RANK = 2;

/** The rank a cantrip cast from a staff is heightened to, like the holder's other cantrips. */
export function staffCantripRank(level: CharacterLevel): SpellRank {
  return SpellRank.parse(Math.max(Math.ceil(level / CANTRIP_LEVELS_A_RANK), 1));
}
