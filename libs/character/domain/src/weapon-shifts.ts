import { ContentId, ContentKind, entrySlug, EtchingRestriction, Slug, UsageType } from '@pioneer/rules/sdk';
import type { EntrySlug, UsageHands } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { meetsRestriction } from './etching-restriction';
import { InventoryItemId } from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import type { ItemContent, ItemEntry } from './inventory-content';
import { itemRunes } from './item-runes';
import type { RuneContent } from './item-runes';

/** The most shaped weapons a character remembers; a shape past it is not kept, so a request cannot grow the play state. */
export const SHIFTS_MAX = 32;

/** The weapon each shapeshifting item has taken the shape of, by its inventory item. An item left out has its own shape. */
export const ShiftsSchema = z.record(InventoryItemId, ContentId).default({});

export type Shifts = z.infer<typeof ShiftsSchema>;

/** The play edits that change a weapon's shape. */
export const ShiftCommandField = {
  /** A weapon with a shifting rune takes the shape of another weapon, or goes back to its own. */
  ShiftWeapon: 'shiftWeapon',
} as const;

export type ShiftCommandField = ValueOf<typeof ShiftCommandField>;

export const ShiftCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ShiftCommandField.ShiftWeapon), item: InventoryItemId, shape: ContentId.optional() }),
]);

export type ShiftCommand = z.infer<typeof ShiftCommandSchema>;

/** Whether `command` is a shape edit. */
export function isShiftCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ShiftCommand> {
  return command.field === ShiftCommandField.ShiftWeapon;
}

/** `shapes` after `command`: the shape taken, or dropped when none is given, unless it is a new one and the character holds the most. */
export function applyShiftCommand(shifts: Shifts, command: ShiftCommand): Shifts {
  if (command.shape === undefined) {
    return Object.fromEntries(Object.entries(shifts).filter(([item]) => item !== command.item));
  }

  const known = command.item in shifts;

  return !known && Object.keys(shifts).length >= SHIFTS_MAX ? shifts : { ...shifts, [command.item]: command.shape };
}

/** The restriction of a melee weapon. */
const MELEE = EtchingRestriction.parse('melee');

/** The entry slug of the shifting rune. */
const SHIFTING: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('shifting'));

/** What a shape is read against: the items and the runes the loaded packs offer. */
export interface ShiftReads {
  readonly items: ItemContent;
  readonly runes: RuneContent;
}

/** The hands a held weapon takes, as its content gives them. */
function handsOf(entry: ItemEntry): UsageHands | undefined {
  if (entry.kind !== ContentKind.Weapon) {
    return undefined;
  }

  return entry.data.usage.type === UsageType.Held ? entry.data.usage.hands : undefined;
}

/** Whether a weapon can take the shape of `shape`: another melee weapon that takes the same number of hands. */
export function shiftFits(base: ItemEntry | undefined, form: ItemEntry | undefined): boolean {
  return (
    base?.kind === ContentKind.Weapon &&
    form?.kind === ContentKind.Weapon &&
    base.id !== form.id &&
    meetsRestriction(form, MELEE) &&
    handsOf(base) === handsOf(form)
  );
}

/** Whether the item has a shifting rune etched on it. */
export function hasShiftingRune(line: InventoryItem, base: ItemEntry | undefined, runes: RuneContent): boolean {
  return itemRunes(line, base).property.some(({ rune }) => runes.get(rune)?.slug === SHIFTING);
}

/** The shapes the item can take: the melee weapons of the content that fit it, by name. */
export function shiftsFor(line: InventoryItem, { items, runes }: ShiftReads): readonly ItemEntry[] {
  const base = items.get(line.item);

  if (!hasShiftingRune(line, base, runes)) {
    return [];
  }

  return [...items.values()].filter((each) => shiftFits(base, each));
}

/** Why a shape edit is refused, if it is. */
export const ShiftProblem = { NotShifting: 'notShifting', NoSuchShift: 'noSuchShape' } as const;

export type ShiftProblem = ValueOf<typeof ShiftProblem>;

/** What refuses `command`: the item has no shifting rune, or the shape is not one it can take. Dropping a shape is never refused. */
export function shiftProblem(inventory: Inventory, reads: ShiftReads, command: ShiftCommand): ShiftProblem | undefined {
  const line = inventory.items.find(({ id }) => id === command.item);

  if (line === undefined || !hasShiftingRune(line, reads.items.get(line.item), reads.runes)) {
    return ShiftProblem.NotShifting;
  }

  const { shape: form } = command;

  return form === undefined || shiftFits(reads.items.get(line.item), reads.items.get(form))
    ? undefined
    : ShiftProblem.NoSuchShift;
}

/** Whether a property rune works on the shape: its etching restriction is met. */
function works(rune: ContentId, form: ItemEntry, runes: RuneContent): boolean {
  const entry = runes.get(rune);

  return entry === undefined || meetsRestriction(form, entry.data.etchedOnto.restriction);
}

/**
 * `inventory` with each shifted item as the weapon it has taken the shape of: the shape's content, with the runes and
 * material of the item. Property runes the shape can't take stay etched but are left out, so they do nothing until the
 * item takes a shape they fit. A shape the item can no longer take (its shifting rune erased) is ignored.
 */
export function shiftedInventory(inventory: Inventory, shifts: Shifts, reads: ShiftReads): Inventory {
  if (Object.keys(shifts).length === 0) {
    return inventory;
  }

  return {
    ...inventory,
    items: inventory.items.map((line) => {
      const shiftId = shifts[line.id];
      const base = reads.items.get(line.item);
      const form = shiftId === undefined ? undefined : reads.items.get(shiftId);

      if (shiftId === undefined || form === undefined || !shiftFits(base, form)) {
        return line;
      }

      if (!hasShiftingRune(line, base, reads.runes)) {
        return line;
      }

      const runes = itemRunes(line, base);

      return {
        ...line,
        item: shiftId,
        runes: { ...runes, property: runes.property.filter(({ rune }) => works(rune, form, reads.runes)) },
      };
    }),
  };
}
