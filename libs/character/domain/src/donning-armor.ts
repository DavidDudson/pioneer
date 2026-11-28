import { ActionCost, ArmorItemCategory, ContentKind, entrySlug, Slug } from '@pioneer/rules/sdk';
import type { EntrySlug } from '@pioneer/rules/sdk';

import type { InventoryItem } from './inventory';
import type { ItemEntry } from './inventory-content';
import { hasEtchedRune } from './item-runes';
import type { RuneContent } from './item-runes';

const READY: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('ready'));
const READY_GREATER: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('ready-greater'));

/** Barding is not donned by its wearer, so a ready rune gives it no cost. */
const BARDING: ReadonlySet<ArmorItemCategory> = new Set([
  ArmorItemCategory.LightBarding,
  ArmorItemCategory.HeavyBarding,
]);

/** The armour categories a ready rune (not its greater grade) only lets be donned in one action. */
const ONE_ACTION_WITH_READY: ReadonlySet<ArmorItemCategory> = new Set([
  ArmorItemCategory.Unarmored,
  ArmorItemCategory.Light,
]);

/** The actions a ready rune makes donning take. */
export type ReadyDonningCost = typeof ActionCost.One | typeof ActionCost.Two;

/** The actions a ready rune makes donning take (GM Core); undefined without one, and for barding or non-armour. */
export function readyDonningCost(
  line: InventoryItem,
  base: ItemEntry | undefined,
  runes: RuneContent,
): ReadyDonningCost | undefined {
  if (base?.kind !== ContentKind.Armor || BARDING.has(base.data.category)) {
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
