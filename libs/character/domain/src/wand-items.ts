import { ConsumableCategory, ContentKind, Uses } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, SpellRank } from '@pioneer/rules/sdk';

import type { InventoryItem } from './inventory';
import type { ItemContent } from './inventory-content';

/** A wand once a day unless its content says more. */
const ONE_USE = Uses.parse(1);

/** The spell a wand holds, the rank it casts it at, and how many times a day it can be cast without overcharging. */
export interface WandSpell {
  readonly spell: ContentId;
  readonly rank: SpellRank;
  readonly uses: Uses;
}

/**
 * The spell a wand entry holds, or undefined when the entry is no wand: a consumable of the wand category that names
 * its spell (play-and-campaigns.md, "Staves and charged items"). The daily uses come from the consumable's `uses`,
 * once when absent.
 */
export function wandSpellOf(entry: ContentEntry | undefined): WandSpell | undefined {
  if (entry?.kind !== ContentKind.Consumable || entry.data.category !== ConsumableCategory.Wand) {
    return undefined;
  }
  const { spell, uses } = entry.data;
  return spell === undefined ? undefined : { spell: spell.spell, rank: spell.rank, uses: uses ?? ONE_USE };
}

/** The spell an inventory item holds as a wand, or undefined when the item is not one. */
export function wandSpell(item: InventoryItem, content: ItemContent): WandSpell | undefined {
  return wandSpellOf(content.get(item.item));
}

/** Wands already read, by registry: a registry's packs never change once loaded. */
const WANDS_READ = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, WandSpell>>();

/** The wand each item in the registry is, if it is one; read once per registry. */
export function itemWands(registry: ContentRegistry): ReadonlyMap<ContentId, WandSpell> {
  const existing = WANDS_READ.get(registry);
  if (existing !== undefined) {
    return existing;
  }
  const read = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .flatMap((entry): [ContentId, WandSpell][] => {
        const wand = wandSpellOf(entry);
        return wand === undefined ? [] : [[entry.id, wand]];
      }),
  );
  WANDS_READ.set(registry, read);
  return read;
}

/** Whether an inventory item is a wand. */
export function isWand(item: InventoryItem, content: ItemContent): boolean {
  return wandSpell(item, content) !== undefined;
}
