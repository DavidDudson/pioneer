import {
  FUNDAMENTAL_GRADE_MAX,
  isSpecific,
  itemRunes,
  printedRunes,
  propertyRoom,
  runedItemOf,
} from '@pioneer/character/domain';
import type {
  Inventory,
  InventoryItem,
  InventoryItemId,
  ItemEntry,
  RunedContent,
  RuneEntry,
  RuneRef,
} from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { FUNDAMENTAL_RUNE_ITEMS, FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

/** The fundamental runes in the order the sheet offers them. */
const FUNDAMENTALS: readonly FundamentalRune[] = Object.values(FundamentalRune);

/** The fundamental runes that go on `entry`: potency and striking on a weapon, potency and resilient on armour, reinforcing on a shield. */
export function fundamentalRunesFor(entry: ItemEntry | undefined): readonly FundamentalRune[] {
  const runed = runedItemOf(entry);
  return runed === undefined ? [] : FUNDAMENTALS.filter((rune) => FUNDAMENTAL_RUNE_ITEMS[rune].includes(runed));
}

/** The grades of `rune` that can be etched onto `entry`: 1 up to the rune's highest, above what a specific item comes with. */
export function gradeChoices(rune: FundamentalRune, entry: ItemEntry | undefined): readonly number[] {
  const printed = printedRunes(entry)?.[rune] ?? 0;
  const max = FUNDAMENTAL_GRADE_MAX[rune];
  const grades: number[] = [];
  for (let grade = printed + 1; grade <= max; grade += 1) {
    grades.push(grade);
  }
  return grades;
}

/** The grade `rune` comes at on a specific item; undefined when it comes without it, or is no specific item. */
export function printedGrade(rune: FundamentalRune, entry: ItemEntry | undefined): number | undefined {
  return printedRunes(entry)?.[rune];
}

/** Whether `item` has room for another property rune: never on a specific item, else one per grade of potency. */
export function hasPropertyRoom(item: InventoryItem, entry: ItemEntry | undefined): boolean {
  const runes = itemRunes(item, entry);
  return !isSpecific(entry) && runes.property.length < propertyRoom(runes);
}

/**
 * The property runes `item` can take, by name: those for its kind of item it hasn't already. None for a specific
 * item, whose property runes are as printed.
 */
export function propertyRuneEntries(
  { runes }: RunedContent,
  { item, entry }: { readonly item: InventoryItem; readonly entry: ItemEntry | undefined },
  compare: (left: string, right: string) => number,
): readonly RuneEntry[] {
  const runed = runedItemOf(entry);
  if (runed === undefined || isSpecific(entry)) {
    return [];
  }
  const etched = itemRunes(item, entry).property;
  return [...runes.values()]
    .filter(({ id, data }) => data.type === RuneType.Property && data.etchedOnto.item === runed && !etched.includes(id))
    .toSorted((left, right) => compare(left.name, right.name));
}

/** The property runes `item` can take, by name, as a select offers them. */
export function propertyRuneOptions(
  content: RunedContent,
  slot: { readonly item: InventoryItem; readonly entry: ItemEntry | undefined },
  compare: (left: string, right: string) => number,
): readonly SelectOption<ContentId>[] {
  return propertyRuneEntries(content, slot, compare).map(({ id, name }) => ({ value: id, label: name }));
}

/** A rune etched onto an item, as the move form names it: `fundamental:potency`, or `property:<id>`. */
export function runeKey(rune: RuneRef): string {
  return `${rune.type}:${rune.rune}`;
}

/** The rune a key names. */
export function runeOfKey(key: string, etched: readonly RuneRef[]): RuneRef | undefined {
  return etched.find((rune) => runeKey(rune) === key);
}

/**
 * The runes etched onto `item` that can move or be erased, in the order the rules name them: none on a specific item,
 * whose runes are its own.
 */
export function etchedRunes(item: InventoryItem, entry: ItemEntry | undefined): readonly RuneRef[] {
  const { runes } = item;
  if (runes === undefined || isSpecific(entry)) {
    return [];
  }
  return [
    ...FUNDAMENTALS.filter((rune) => runes[rune] !== undefined).map((rune): RuneRef => ({
      type: RuneType.Fundamental,
      rune,
    })),
    ...runes.property.map((rune): RuneRef => ({ type: RuneType.Property, rune })),
  ];
}

/**
 * The items `id`'s runes can move onto: every other item of the same kind (weapon, armour or shield) that isn't a
 * specific item.
 */
export function transferTargets(
  inventory: Inventory,
  { items }: RunedContent,
  id: InventoryItemId,
): readonly InventoryItemId[] {
  const from = inventory.items.find((each) => each.id === id);
  const runed = from === undefined ? undefined : runedItemOf(items.get(from.item));
  if (runed === undefined) {
    return [];
  }
  return inventory.items.flatMap((each): InventoryItemId[] => {
    const entry = items.get(each.item);
    return each.id === id || isSpecific(entry) || runedItemOf(entry) !== runed ? [] : [each.id];
  });
}
