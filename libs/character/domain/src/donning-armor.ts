import { ActionCost, ArmorItemCategory, ContentKind, entrySlug, Slug } from '@pioneer/rules/sdk';
import type { EntrySlug } from '@pioneer/rules/sdk';

import type { InventoryItem } from './inventory';
import type { ItemEntry } from './inventory-content';
import { hasEtchedRune } from './item-runes';
import type { RuneContent } from './item-runes';

const READY: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('ready'));
const READY_GREATER: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('ready-greater'));

/** The armour categories a ready rune (not its greater grade) only lets be donned in one action. */
const ONE_ACTION_WITH_READY: ReadonlySet<ArmorItemCategory> = new Set([
  ArmorItemCategory.Unarmored,
  ArmorItemCategory.Light,
]);

/**
 * The actions it takes to don the armour because of a ready rune (GM Core): one action for any armour with a greater
 * ready rune, or for light armour with a ready rune, and a 2-action activity for medium or heavy armour with a ready
 * rune. Undefined for armour with neither rune, whose donning time the rules give in minutes and this does not model,
 * and for anything that is not armour.
 */
export function readyDonningCost(
  line: InventoryItem,
  base: ItemEntry | undefined,
  runes: RuneContent,
): typeof ActionCost.One | typeof ActionCost.Two | undefined {
  if (base?.kind !== ContentKind.Armor) {
    return undefined;
  }

  if (hasEtchedRune(line, base, { runes, slug: READY_GREATER })) {
    return ActionCost.One;
  }

  if (!hasEtchedRune(line, base, { runes, slug: READY })) {
    return undefined;
  }

  return ONE_ACTION_WITH_READY.has(base.data.category) ? ActionCost.One : ActionCost.Two;
}
