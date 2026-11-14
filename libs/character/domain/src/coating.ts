import {
  bulkInTenths,
  BulkTenths,
  ConsumableCategory,
  ContentKind,
  entrySlug,
  Slug,
  TENTHS_PER_BULK,
  Trait,
} from '@pioneer/rules/sdk';
import type { ContentId, EntrySlug } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { InventoryItem } from './inventory';
import type { ItemContent, ItemEntry } from './inventory-content';
import { hasEtchedRune } from './item-runes';
import type { RuneContent } from './item-runes';

const COATING: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('coating'));
const INJURY = Trait.parse('injury');

/** What a coating rune's space holds: 1 Bulk. */
export const COATING_CAPACITY: BulkTenths = TENTHS_PER_BULK;

/** Why an item cannot go into the space of a coating rune. */
export const CoatingProblem = {
  NoRune: 'noRune',
  NotPoisonOrOil: 'notPoisonOrOil',
  TooMuchBulk: 'tooMuchBulk',
} as const;
export type CoatingProblem = ValueOf<typeof CoatingProblem>;

/** Whether the item has a coating rune etched on it. */
export function hasCoatingRune(line: InventoryItem, base: ItemEntry | undefined, runes: RuneContent): boolean {
  return hasEtchedRune(line, base, { runes, slug: COATING });
}

/** Whether `entry` is a poison or oil that can be applied to a weapon: an oil, or an injury poison. */
export function fitsCoating(entry: ItemEntry | undefined): boolean {
  if (entry?.kind !== ContentKind.Consumable) {
    return false;
  }
  const { category } = entry.data;
  return (
    category === ConsumableCategory.Oil || (category === ConsumableCategory.Poison && entry.traits.includes(INJURY))
  );
}

/** The Bulk the items stored in the space come to, in tenths; one the content does not know weighs nothing. */
export function coatingBulk(stored: readonly ContentId[], items: ItemContent): BulkTenths {
  let total = 0;
  for (const id of stored) {
    const entry = items.get(id);
    total += entry === undefined || !('bulk' in entry.data) ? 0 : bulkInTenths(entry.data.bulk);
  }
  return BulkTenths.parse(total);
}

/** What refuses putting `item` into the space of the coating rune on `line`; undefined when it fits. */
export function coatingRefusal(
  line: InventoryItem,
  item: ContentId,
  reads: { readonly items: ItemContent; readonly runes: RuneContent },
): CoatingProblem | undefined {
  if (!hasCoatingRune(line, reads.items.get(line.item), reads.runes)) {
    return CoatingProblem.NoRune;
  }
  const entry = reads.items.get(item);
  if (!fitsCoating(entry)) {
    return CoatingProblem.NotPoisonOrOil;
  }
  const held = coatingBulk([...(line.state?.coating ?? []), item], reads.items);
  return held > COATING_CAPACITY ? CoatingProblem.TooMuchBulk : undefined;
}
