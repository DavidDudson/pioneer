import type { ContentLookup, GrantResolution, OwnedItem } from '@pioneer/rules/grants';
import { ContentKind, ContentText, RollOptionTail, RuleElementKey, Slug, slugName } from '@pioneer/rules/sdk';
import type { RuleSlug } from '@pioneer/rules/sdk';

import type { Inventory, InventoryItemId } from './inventory';
import { equippedState } from './inventory-content';
import type { ItemContent, ItemEntry } from './inventory-content';
import { uniqueSlug } from './unique-slug';

const EQUIPPED = RollOptionTail.parse('equipped');
const RANGED = RollOptionTail.parse('ranged');

/**
 * The name each inventory line's item goes by (ADR-0075): its content's slug, or `<slug>-2`, `<slug>-3` for a second
 * and third of the same kind, in inventory order. A weapon's is its Strike's slug, whether or not it is equipped, so a
 * `ChoiceSet` pick keeps naming the same weapon as the character's gear changes. A line whose content is gone has none.
 */
export function itemSlugs(inventory: Inventory, content: ItemContent): ReadonlyMap<InventoryItemId, Slug> {
  const taken = new Map<ContentKind, Set<Slug>>();
  const slugs = new Map<InventoryItemId, Slug>();
  for (const line of inventory.items) {
    const entry = content.get(line.item);
    if (entry !== undefined) {
      const used = taken.get(entry.kind) ?? new Set<Slug>();
      taken.set(entry.kind, used);
      const slug = uniqueSlug(slugName(entry.slug), used);
      used.add(slug);
      slugs.set(line.id, slug);
    }
  }
  return slugs;
}

/** What a predicate over `item:` can read of an owned item: its kind, slug, traits, weapon group, base and reach. */
function optionsOf(entry: ItemEntry, equipped: boolean): readonly RollOptionTail[] {
  const weapon =
    entry.kind === ContentKind.Weapon
      ? [
          ...(entry.data.group === undefined ? [] : [`group:${entry.data.group}`]),
          ...(entry.data.baseItem === undefined ? [] : [`base:${entry.data.baseItem}`]),
          `damage:type:${entry.data.damage.damageType}`,
        ].map((option) => RollOptionTail.parse(option))
      : [];
  return [
    RollOptionTail.parse(`type:${entry.kind}`),
    RollOptionTail.parse(`slug:${slugName(entry.slug)}`),
    ...entry.traits.map((trait) => RollOptionTail.parse(`trait:${trait}`)),
    ...weapon,
    ...(entry.kind === ContentKind.Weapon && entry.data.range !== undefined ? [RANGED] : []),
    ...(equipped ? [EQUIPPED] : []),
  ];
}

/** The items the character owns, as a `ChoiceSet` over them reads them: each line with the slug a pick names it by. */
export function ownedItems(inventory: Inventory, content: ItemContent): readonly OwnedItem[] {
  const slugs = itemSlugs(inventory, content);
  return inventory.items.flatMap((line): OwnedItem[] => {
    const entry = content.get(line.item);
    const slug = slugs.get(line.id);
    if (entry === undefined || slug === undefined) {
      return [];
    }
    return [
      {
        slug,
        name: line.name === undefined ? entry.name : ContentText.parse(line.name),
        kind: entry.kind,
        rollOptions: optionsOf(entry, equippedState(line, entry) !== undefined),
      },
    ];
  });
}

/** The flags of the `ChoiceSet`s over owned items that picked each item, by the item's slug (ADR-0075). */
export type PickedItems = ReadonlyMap<Slug, readonly RuleSlug[]>;

export const NO_PICKED_ITEMS: PickedItems = new Map();

/** Which items the character's answered `ChoiceSet`s over owned items picked, and under which flags. */
export function pickedItems(resolution: GrantResolution, lookup: ContentLookup): PickedItems {
  const picked = new Map<Slug, RuleSlug[]>();
  for (const { pick, flag, origin, rule } of resolution.answered) {
    const element = lookup.entry(origin.entry)?.rules[rule];
    const owned =
      element?.key === RuleElementKey.ChoiceSet && !Array.isArray(element.choices) && 'ownedKinds' in element.choices;
    const slug = owned ? Slug.safeParse(pick) : undefined;
    if (slug?.success === true) {
      picked.set(slug.data, [...(picked.get(slug.data) ?? []), flag]);
    }
  }
  return picked;
}
