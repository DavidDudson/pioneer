import { ContentKind, RunedItem, RuneType } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import type { InventoryItem } from './inventory';
import type { ItemContent, ItemEntry } from './inventory-content';
import { CORE_RULE_LIMITS } from './rule-limits';
import type { RuleLimits } from './rule-limits';
import { NO_RUNES } from './rune-etching';
import type { ItemRunes } from './rune-etching';

/** A rune content entry. */
export type RuneEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Rune }>;

/** Every rune the loaded packs offer, by id. */
export type RuneContent = ReadonlyMap<ContentId, RuneEntry>;

function isRuneEntry(entry: ContentEntry): entry is RuneEntry {
  return entry.kind === ContentKind.Rune;
}

/** The runes in `registry`'s packs. A later pack's entry of the same id wins, as in the registry. */
export function runeContent(registry: ContentRegistry): RuneContent {
  const runes = registry.packs.flatMap((pack) => pack.otherEntries.filter((entry) => isRuneEntry(entry)));
  return new Map(runes.map((entry) => [entry.id, entry]));
}

/** What a rune edit reads: the items the character can carry and the runes it can etch onto them. */
export interface RunedContent {
  readonly items: ItemContent;
  readonly runes: RuneContent;
  /** The limits the table holds items to; the core rules' when absent. */
  readonly limits?: RuleLimits | undefined;
}

/** What an item's content is, as runes read it: a weapon, armour or a shield; undefined for anything else. */
export function runedItemOf(entry: ItemEntry | undefined): RunedItem | undefined {
  switch (entry?.kind) {
    case ContentKind.Weapon: {
      return RunedItem.Weapon;
    }
    case ContentKind.Armor: {
      return RunedItem.Armor;
    }
    case ContentKind.Shield: {
      return RunedItem.Shield;
    }
    case ContentKind.Consumable:
    case ContentKind.Equipment:
    case ContentKind.Treasure:
    case undefined: {
      return undefined;
    }
    default: {
      return entry satisfies never;
    }
  }
}

/** The runes a specific magic item comes with; none for any other item. A shield's integrated weapon's are its own. */
export function printedRunes(entry: ItemEntry | undefined): ItemRunes | undefined {
  switch (entry?.kind) {
    case ContentKind.Weapon:
    case ContentKind.Armor: {
      return entry.data.runes;
    }
    case ContentKind.Shield: {
      return entry.data.runes === undefined ? undefined : { ...NO_RUNES, ...entry.data.runes };
    }
    case ContentKind.Consumable:
    case ContentKind.Equipment:
    case ContentKind.Treasure:
    case undefined: {
      return undefined;
    }
    default: {
      return entry satisfies never;
    }
  }
}

/** Whether `entry` is a specific magic item: one that comes with runes, whose property runes can't change. */
export function isSpecific(entry: ItemEntry | undefined): boolean {
  return printedRunes(entry) !== undefined;
}

function higher<Grade extends number>(left: Grade | undefined, right: Grade | undefined): Grade | undefined {
  if (left === undefined) {
    return right;
  }
  return right === undefined || left >= right ? left : right;
}

/**
 * The runes on `item`: those its content comes with, each fundamental rune etched higher where it was, and the
 * property runes etched onto it.
 */
export function itemRunes(item: InventoryItem, entry: ItemEntry | undefined): ItemRunes {
  const etched = item.runes ?? NO_RUNES;
  const printed = printedRunes(entry);
  if (printed === undefined) {
    return etched;
  }
  return {
    potency: higher(printed.potency, etched.potency),
    striking: higher(printed.striking, etched.striking),
    resilient: higher(printed.resilient, etched.resilient),
    reinforcing: higher(printed.reinforcing, etched.reinforcing),
    property: printed.property,
  };
}

/** Whether `runes` holds any rune at all. */
export function hasRunes(runes: ItemRunes): boolean {
  const { property, ...fundamental } = runes;
  return property.length > 0 || Object.values(fundamental).some((grade) => grade !== undefined);
}

/** A count of property runes. */
export const PropertyRuneCount = Pg.smallint().nonnegative().brand<'PropertyRuneCount'>();
export type PropertyRuneCount = z.infer<typeof PropertyRuneCount>;

/** How many property runes `runes` holds room for: the limit's per grade of its potency rune. */
export function propertyRoom(runes: ItemRunes, limits: RuleLimits = CORE_RULE_LIMITS): PropertyRuneCount {
  return PropertyRuneCount.parse((runes.potency ?? 0) * limits.propertyRunesPerGrade);
}

/**
 * The property runes that work on `item`. A specific item's all work; on any other, as many as its potency rune's
 * grade, first etched first. The rest stay etched, doing nothing, until a potency rune is etched high enough.
 */
export function workingPropertyRunes(
  item: InventoryItem,
  entry: ItemEntry | undefined,
  limits: RuleLimits = CORE_RULE_LIMITS,
): readonly ContentId[] {
  const runes = itemRunes(item, entry);
  return isSpecific(entry) ? runes.property : runes.property.slice(0, propertyRoom(runes, limits));
}

/**
 * Whether the engine applies `rune`: a property rune does when it has rules or an activation, and is not flagged
 * `unapplied`. Fundamental runes are applied by the item's own numbers.
 */
export function runeApplied(rune: RuneEntry): boolean {
  const { data } = rune;
  if (data.type !== RuneType.Property) {
    return true;
  }
  return data.unapplied !== true && (rune.rules.length > 0 || data.activations !== undefined);
}
