import { FoundryItemType } from './foundry-document';
import { asciiSlug } from './foundry-slug';
import type { SelectedEntry } from './select-entries';

/**
 * Pioneer slugs for selected documents. Foundry slugs are unique per compendium, but an entry id is UUIDv5 of
 * `<pack>/<slug>` whatever the kind, so a spell and an action that share a name (Fly) would share an id. Within such
 * a group the document of the type earliest in `TYPE_PRECEDENCE` keeps the slug, and each other one gets its Foundry
 * type as a suffix (`fly-spell`). Archive path breaks ties, so the result does not depend on read order.
 */

/**
 * Which type keeps a shared slug: the rules vocabulary first (actions are what other entries name), then character
 * options, then the magic and items they grant.
 */
const TYPE_PRECEDENCE: readonly FoundryItemType[] = [
  FoundryItemType.Action,
  FoundryItemType.Condition,
  FoundryItemType.Feat,
  FoundryItemType.Spell,
  FoundryItemType.Ancestry,
  FoundryItemType.Heritage,
  FoundryItemType.Background,
  FoundryItemType.Class,
  FoundryItemType.Deity,
  FoundryItemType.Effect,
  FoundryItemType.Weapon,
  FoundryItemType.Armor,
  FoundryItemType.Shield,
  FoundryItemType.Equipment,
  FoundryItemType.Consumable,
  FoundryItemType.Ammo,
  FoundryItemType.Backpack,
  FoundryItemType.Treasure,
  FoundryItemType.Kit,
];

function byPrecedence(left: SelectedEntry, right: SelectedEntry): number {
  return (
    TYPE_PRECEDENCE.indexOf(left.type) - TYPE_PRECEDENCE.indexOf(right.type) || left.path.localeCompare(right.path)
  );
}

function groupBySlug(selected: readonly SelectedEntry[]): ReadonlyMap<string, readonly SelectedEntry[]> {
  const groups = new Map<string, SelectedEntry[]>();
  for (const entry of selected) {
    const slug = asciiSlug(entry.document);
    groups.set(slug, [...(groups.get(slug) ?? []), entry]);
  }
  return groups;
}

/**
 * Each selected document's slug, suffixed where documents of other types share it. Two documents of one type with
 * one slug still collide; translation reports the later one.
 */
export function entrySlugs(selected: readonly SelectedEntry[]): ReadonlyMap<SelectedEntry, string> {
  const slugs = new Map<SelectedEntry, string>();
  for (const [slug, group] of groupBySlug(selected)) {
    const [first, ...rest] = group.toSorted(byPrecedence);
    for (const entry of rest) {
      slugs.set(entry, entry.type === first?.type ? slug : `${slug}-${entry.type}`);
    }
    if (first !== undefined) {
      slugs.set(first, slug);
    }
  }
  return slugs;
}
