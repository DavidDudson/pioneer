import { potencyAfter } from '@pioneer/rules/engine';
import type { PotencyChange } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import type { ContentLookup } from '@pioneer/rules/grants';
import {
  ContentKind,
  NumericItemProperty,
  raisesPotency,
  RUNE_GRADE_MAX,
  RunedItem,
  RuneGrade,
  RuneType,
} from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, EntrySlug, RuleElement } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import type { InventoryItem } from './inventory';
import type { ItemContent, ItemEntry } from './inventory-content';
import { CORE_RULE_LIMITS } from './rule-limits';
import type { RuleLimits } from './rule-limits';
import { NO_RUNES, RuneChoice } from './rune-etching';
import type { EtchedRune, ItemRunes } from './rune-etching';

/** A rune content entry. */
export type RuneEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Rune }>;

/** Every rune the loaded packs offer, by id. */
export type RuneContent = ReadonlyMap<ContentId, RuneEntry>;

function isRuneEntry(entry: ContentEntry): entry is RuneEntry {
  return entry.kind === ContentKind.Rune;
}

/** Whether the item has the property rune `slug` etched on it, working or not. */
export function hasEtchedRune(
  line: InventoryItem,
  base: ItemEntry | undefined,
  { runes, slug }: { readonly runes: RuneContent; readonly slug: EntrySlug },
): boolean {
  return itemRunes(line, base).property.some(({ rune }) => runes.get(rune)?.slug === slug);
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

/** The runes a weapon or armour is printed with: its fundamental grades, its property runes and what each is for. */
interface PrintedRunes {
  readonly potency?: RuneGrade | undefined;
  readonly striking?: RuneGrade | undefined;
  readonly resilient?: RuneGrade | undefined;
  readonly property: readonly ContentId[];
  /** The energy a rune was printed for, by rune: Foundry's `propertyEnergy`. */
  readonly propertyEnergy?: Readonly<Record<ContentId, string>> | undefined;
}

/** Printed runes as etched ones: each property rune with the energy the item was printed for, when it names one. */
function printedEtched({ propertyEnergy, property, ...grades }: PrintedRunes): ItemRunes {
  return {
    ...grades,
    property: property.map((rune) => {
      const choice = RuneChoice.safeParse(propertyEnergy?.[rune]);
      return choice.success ? { rune, choice: choice.data } : { rune };
    }),
  };
}

/** The runes a specific magic item comes with; none for any other item. A shield's integrated weapon's are its own. */
export function printedRunes(entry: ItemEntry | undefined): ItemRunes | undefined {
  switch (entry?.kind) {
    case ContentKind.Weapon:
    case ContentKind.Armor: {
      return entry.data.runes === undefined ? undefined : printedEtched(entry.data.runes);
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

/** What a rune's rules say about its item. */
export interface RuneRules {
  readonly rules: readonly RuleElement[];
}

/** Reads a rune's rules by id; undefined for a rune the loaded packs lack. */
export type RuneReader = (rune: ContentId) => RuneRules | undefined;

/** Reads runes through `lookup`; a content entry that is not a rune reads as none. */
export function runeReader(lookup: ContentLookup): RuneReader {
  return (rune) => {
    const entry = lookup.entry(rune);
    return entry?.kind === ContentKind.Rune ? entry : undefined;
  };
}

/** The reader over a map of runes. */
export function readerOf(content: RuneContent): RuneReader {
  return (rune) => content.get(rune);
}

/** The potency changes the etched `rune` makes to its item: those of its `raisesPotency` rules. */
function potencyChangesOf(rune: RuneRules | undefined): readonly PotencyChange[] {
  const changes: PotencyChange[] = [];
  for (const element of rune?.rules ?? []) {
    if (raisesPotency(element) && element.property === NumericItemProperty.Potency) {
      changes.push({ mode: element.mode, value: element.value });
    }
  }
  return changes;
}

/**
 * Whether `rune` takes no property rune slot: it raises the potency of the item it is etched onto (a mythic potency
 * rune), so the room it makes cannot be spent on itself (ADR-0078).
 */
export function takesNoSlot(rune: RuneRules | undefined): boolean {
  return potencyChangesOf(rune).length > 0;
}

/** The grade of potency `runes` give an item: its potency rune's, raised by the etched runes that raise it. */
export function itemPotency(runes: ItemRunes, read: RuneReader): RuneGrade | undefined {
  const changes = runes.property.flatMap(({ rune }) => potencyChangesOf(read(rune)));
  const grade = potencyAfter(runes.potency === undefined ? undefined : FormulaValue.parse(runes.potency), changes);
  return grade === undefined || grade < 1 ? undefined : RuneGrade.parse(Math.min(grade, RUNE_GRADE_MAX));
}

/** The etched property runes of `runes` that take one of its slots: all but those that raise its potency. */
export function slottedRunes(runes: ItemRunes, read: RuneReader): readonly EtchedRune[] {
  return runes.property.filter(({ rune }) => !takesNoSlot(read(rune)));
}

/**
 * How many property runes `runes` holds room for: the limit's per grade of its potency, which a rune that raises it
 * counts. A mythic potency rune makes room for a fourth and takes none itself.
 */
export function propertyRoom(
  runes: ItemRunes,
  read: RuneReader,
  limits: RuleLimits = CORE_RULE_LIMITS,
): PropertyRuneCount {
  return PropertyRuneCount.parse((itemPotency(runes, read) ?? 0) * limits.propertyRunesPerGrade);
}

/**
 * The etched property runes that work on `item`. A specific item's all work; on any other, the runes that raise
 * potency and as many of the rest as its potency's grade, first etched first. The rest stay etched, doing nothing,
 * until a potency rune is etched high enough.
 */
export function workingEtchedRunes(
  item: InventoryItem,
  entry: ItemEntry | undefined,
  read: RuneReader,
): readonly EtchedRune[] {
  const runes = itemRunes(item, entry);
  if (isSpecific(entry)) {
    return runes.property;
  }
  const room = propertyRoom(runes, read);
  let slotted = 0;
  return runes.property.filter(({ rune }) => {
    if (takesNoSlot(read(rune))) {
      return true;
    }
    slotted += 1;
    return slotted <= room;
  });
}

/** The property runes that work on `item` (`workingEtchedRunes`). */
export function workingPropertyRunes(
  item: InventoryItem,
  entry: ItemEntry | undefined,
  read: RuneReader,
): readonly ContentId[] {
  return workingEtchedRunes(item, entry, read).map(({ rune }) => rune);
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
