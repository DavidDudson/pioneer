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
export const SHAPES_MAX = 32;

/** The weapon each shapeshifting item has taken the shape of, by its inventory item. An item left out has its own shape. */
export const ShapesSchema = z.record(InventoryItemId, ContentId).default({});
export type Shapes = z.infer<typeof ShapesSchema>;

/** The play edits that change a weapon's shape. */
export const ShapeCommandField = {
  /** A weapon with a shifting rune takes the shape of another weapon, or goes back to its own. */
  ShiftWeapon: 'shiftWeapon',
} as const;
export type ShapeCommandField = ValueOf<typeof ShapeCommandField>;

export const ShapeCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ShapeCommandField.ShiftWeapon), item: InventoryItemId, shape: ContentId.optional() }),
]);
export type ShapeCommand = z.infer<typeof ShapeCommandSchema>;

/** Whether `command` is a shape edit. */
export function isShapeCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ShapeCommand> {
  return command.field === ShapeCommandField.ShiftWeapon;
}

/** `shapes` after `command`: the shape taken, or dropped when none is given, unless it is a new one and the character holds the most. */
export function applyShapeCommand(shapes: Shapes, command: ShapeCommand): Shapes {
  if (command.shape === undefined) {
    return Object.fromEntries(Object.entries(shapes).filter(([item]) => item !== command.item));
  }
  const known = command.item in shapes;
  return !known && Object.keys(shapes).length >= SHAPES_MAX ? shapes : { ...shapes, [command.item]: command.shape };
}

/** The restriction of a melee weapon. */
const MELEE = EtchingRestriction.parse('melee');

/** The entry slug of the shifting rune. */
const SHIFTING: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('shifting'));

/** What a shape is read against: the items and the runes the loaded packs offer. */
export interface ShapeReads {
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
export function shapeFits(base: ItemEntry | undefined, shape: ItemEntry | undefined): boolean {
  return (
    base?.kind === ContentKind.Weapon &&
    shape?.kind === ContentKind.Weapon &&
    base.id !== shape.id &&
    meetsRestriction(shape, MELEE) &&
    handsOf(base) === handsOf(shape)
  );
}

/** Whether the item has a shifting rune etched on it. */
export function hasShiftingRune(line: InventoryItem, base: ItemEntry | undefined, runes: RuneContent): boolean {
  return itemRunes(line, base).property.some(({ rune }) => runes.get(rune)?.slug === SHIFTING);
}

/** The shapes the item can take: the melee weapons of the content that fit it, by name. */
export function shapesFor(line: InventoryItem, { items, runes }: ShapeReads): readonly ItemEntry[] {
  const base = items.get(line.item);
  if (!hasShiftingRune(line, base, runes)) {
    return [];
  }
  return [...items.values()].filter((each) => shapeFits(base, each));
}

/** Why a shape edit is refused, if it is. */
export const ShapeProblem = { NotShifting: 'notShifting', NoSuchShape: 'noSuchShape' } as const;
export type ShapeProblem = ValueOf<typeof ShapeProblem>;

/** What refuses `command`: the item has no shifting rune, or the shape is not one it can take. Dropping a shape is never refused. */
export function shapeProblem(inventory: Inventory, reads: ShapeReads, command: ShapeCommand): ShapeProblem | undefined {
  const line = inventory.items.find(({ id }) => id === command.item);
  if (line === undefined || !hasShiftingRune(line, reads.items.get(line.item), reads.runes)) {
    return ShapeProblem.NotShifting;
  }
  const { shape } = command;
  return shape === undefined || shapeFits(reads.items.get(line.item), reads.items.get(shape))
    ? undefined
    : ShapeProblem.NoSuchShape;
}

/** Whether a property rune works on the shape: its etching restriction is met. */
function works(rune: ContentId, shape: ItemEntry, runes: RuneContent): boolean {
  const entry = runes.get(rune);
  return entry === undefined || meetsRestriction(shape, entry.data.etchedOnto.restriction);
}

/**
 * `inventory` with each shifted item as the weapon it has taken the shape of: the shape's content, with the runes and
 * material of the item. Property runes the shape can't take stay etched but are left out, so they do nothing until the
 * item takes a shape they fit. A shape the item can no longer take (its shifting rune erased) is ignored.
 */
export function shapedInventory(inventory: Inventory, shapes: Shapes, reads: ShapeReads): Inventory {
  if (Object.keys(shapes).length === 0) {
    return inventory;
  }
  return {
    ...inventory,
    items: inventory.items.map((line) => {
      const shapeId = shapes[line.id];
      const base = reads.items.get(line.item);
      const shape = shapeId === undefined ? undefined : reads.items.get(shapeId);
      if (shapeId === undefined || shape === undefined || !shapeFits(base, shape)) {
        return line;
      }
      if (!hasShiftingRune(line, base, reads.runes)) {
        return line;
      }
      const runes = itemRunes(line, base);
      return {
        ...line,
        item: shapeId,
        runes: { ...runes, property: runes.property.filter(({ rune }) => works(rune, shape, reads.runes)) },
      };
    }),
  };
}
