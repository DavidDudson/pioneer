import { ContentKind } from '@pioneer/rules/sdk';

import { FoundryItemType } from './foundry-document';
import { asciiSlug } from './foundry-slug';
import type { SelectedEntry } from './select-entries';

/**
 * Pioneer slugs for selected documents: the kind, then Foundry's slug (`spell:fly`, `action:fly`). Every kind names
 * its entries the same way, so documents of different types never share a slug; two of one kind and name still do,
 * and translation reports the later one.
 */

/**
 * The kind each Foundry item type's entries are filed under. The kind stories refine some by category (a feat that
 * is a class feature, a spell that is a ritual); until then this is the kind their slug names.
 */
export const FOUNDRY_TYPE_KINDS: Readonly<Record<FoundryItemType, ContentKind>> = {
  [FoundryItemType.Action]: ContentKind.Action,
  [FoundryItemType.Ammo]: ContentKind.Consumable,
  [FoundryItemType.Ancestry]: ContentKind.Ancestry,
  [FoundryItemType.Armor]: ContentKind.Armor,
  [FoundryItemType.Backpack]: ContentKind.Equipment,
  [FoundryItemType.Background]: ContentKind.Background,
  [FoundryItemType.Class]: ContentKind.Class,
  [FoundryItemType.Condition]: ContentKind.Condition,
  [FoundryItemType.Consumable]: ContentKind.Consumable,
  [FoundryItemType.Deity]: ContentKind.Deity,
  [FoundryItemType.Effect]: ContentKind.Effect,
  [FoundryItemType.Equipment]: ContentKind.Equipment,
  [FoundryItemType.Feat]: ContentKind.Feat,
  [FoundryItemType.Heritage]: ContentKind.Heritage,
  [FoundryItemType.Kit]: ContentKind.Kit,
  [FoundryItemType.Shield]: ContentKind.Shield,
  [FoundryItemType.Spell]: ContentKind.Spell,
  [FoundryItemType.Treasure]: ContentKind.Treasure,
  [FoundryItemType.Weapon]: ContentKind.Weapon,
};

/** A selected document's slug text; translation checks it is an entry slug. */
export function entrySlugOf({ type, document }: SelectedEntry): string {
  return `${FOUNDRY_TYPE_KINDS[type]}:${asciiSlug(document)}`;
}

/** The slug text of each selected document. */
export function entrySlugs(selected: readonly SelectedEntry[]): ReadonlyMap<SelectedEntry, string> {
  return new Map(selected.map((entry) => [entry, entrySlugOf(entry)]));
}
