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
 * The kind each Foundry item type's entries are filed under; `documentKind` refines feats by category (a class
 * feature) and spells by their ritual data (a ritual).
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

/** Foundry's feat `category` for each feature that is its own kind. */
const FEATURE_KINDS: Readonly<Record<string, ContentKind>> = {
  ancestryfeature: ContentKind.AncestryFeature,
  classfeature: ContentKind.ClassFeature,
};

/** Foundry's usage prefix for a rune, which it stores as equipment (ADR-0023). */
export const ETCHED_ONTO = 'etched-onto-';

/** Whether a `system.usage` is a rune's: `{ "value": "etched-onto-a-weapon" }`. */
function isEtched(usage: unknown): boolean {
  if (typeof usage !== 'object' || usage === null || !('value' in usage)) {
    return false;
  }
  const { value } = usage;
  return typeof value === 'string' && value.startsWith(ETCHED_ONTO);
}

/**
 * The kind a selected document's entry is: its type's, `class-feature` or `ancestry-feature` for a feat Foundry
 * files as one, `ritual` for a spell with ritual data, as Foundry stores rituals, or `rune` for equipment with an
 * `etched-onto-…` usage.
 */
export function documentKind({ type, document }: SelectedEntry): ContentKind {
  const { category, ritual, usage } = document.system;
  const feature = typeof category === 'string' && Object.hasOwn(FEATURE_KINDS, category) ? FEATURE_KINDS[category] : undefined;
  if (type === FoundryItemType.Feat && feature !== undefined) {
    return feature;
  }
  if (type === FoundryItemType.Spell && ritual !== undefined && ritual !== null) {
    return ContentKind.Ritual;
  }
  if (type === FoundryItemType.Equipment && isEtched(usage)) {
    return ContentKind.Rune;
  }
  return FOUNDRY_TYPE_KINDS[type];
}

/** A selected document's slug text; translation checks it is an entry slug. */
export function entrySlugOf(entry: SelectedEntry): string {
  return `${documentKind(entry)}:${asciiSlug(entry.document)}`;
}

/** The slug text of each selected document. */
export function entrySlugs(selected: readonly SelectedEntry[]): ReadonlyMap<SelectedEntry, string> {
  return new Map(selected.map((entry) => [entry, entrySlugOf(entry)]));
}
