import { abilityUseKey, heldContentIds } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { ContentKind, Trait } from '@pioneer/rules/sdk';
import type { ConditionRemoval, ContentEntry, ContentId, ContentRegistry, SpellRank } from '@pioneer/rules/sdk';
import type { PreviewEaseOption } from '@pioneer/rules/ui';

import { countedViews } from './sheet-counted';
import type { CountedViews } from './sheet-counted';

/** A cantrip needs no slot. */
const CANTRIP = Trait.parse('cantrip');

/** An entry that says it removes or lowers a condition, with the removal it declares. */
interface Remover {
  readonly entry: ContentEntry;
  readonly removal: ConditionRemoval;
}

/** The entries that ease each condition, by registry: a loaded registry never changes, so each is indexed once. */
const REMOVERS = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, readonly Remover[]>>();

/** The removals an entry declares; none for a kind that declares none. */
function removalsOf(entry: ContentEntry): readonly ConditionRemoval[] {
  if (
    entry.kind === ContentKind.Spell ||
    entry.kind === ContentKind.Feat ||
    entry.kind === ContentKind.Action ||
    entry.kind === ContentKind.Consumable
  ) {
    return entry.data.removesConditions ?? [];
  }
  return [];
}

function removersOf(registry: ContentRegistry): ReadonlyMap<ContentId, readonly Remover[]> {
  const cached = REMOVERS.get(registry);
  if (cached !== undefined) {
    return cached;
  }
  const byCondition = new Map<ContentId, Remover[]>();
  for (const entry of registry.packs.flatMap((pack) => pack.otherEntries)) {
    for (const removal of removalsOf(entry)) {
      byCondition.set(removal.condition, [...(byCondition.get(removal.condition) ?? []), { entry, removal }]);
    }
  }
  REMOVERS.set(registry, byCondition);
  return byCondition;
}

/** What the character can use of an option now: whether it can, and how many are left where the entry is counted. */
interface Availability {
  readonly available: boolean;
  readonly left?: number;
}

/** The slots of a rank at least `rank` that are left; none when the character has no slots to count. */
function slotsLeft(views: CountedViews, rank: SpellRank): number | undefined {
  const fitting = views.slots.filter((slot) => slot.rank >= rank);
  return fitting.length === 0 ? undefined : fitting.reduce((total, slot) => total + slot.current, 0);
}

function countedLeft(left: number | undefined): Availability {
  return left === undefined ? { available: true } : { available: left > 0, left };
}

/** How much of a held entry the character has left to use: slots for a spell, a stack, or the uses of a frequency. */
function availability(entry: ContentEntry, character: Character, views: CountedViews): Availability {
  if (entry.kind === ContentKind.Spell) {
    return entry.traits.includes(CANTRIP) ? { available: true } : countedLeft(slotsLeft(views, entry.data.rank));
  }
  if (entry.kind === ContentKind.Consumable) {
    const quantity = character.document.inventory.items
      .filter(({ item }) => item === entry.id)
      .reduce((total, item) => total + item.quantity, 0);
    return { available: quantity > 0, left: quantity };
  }
  const key = abilityUseKey(entry.id);
  return countedLeft(views.uses.find((use) => use.key === key)?.current);
}

function optionOf({ entry, removal }: Remover, stock: Availability): PreviewEaseOption {
  return {
    source: { id: entry.id, name: entry.name },
    effect: removal.effect,
    ...(removal.by === undefined ? {} : { by: removal.by }),
    ...(removal.rank === undefined ? {} : { rank: removal.rank }),
    ...stock,
  };
}

/**
 * What the character has that ends or eases the condition `condition`: the spells it knows, feats it took and
 * consumables it carries whose entries declare that they remove, lower or counteract it, each with whether the
 * character can use it now. Usable ones come first. A spell not prepared is not told apart from one that is.
 */
export function conditionEaseOptions(
  registry: ContentRegistry,
  character: Character,
  condition: ContentId,
): readonly PreviewEaseOption[] {
  const removers = removersOf(registry).get(condition) ?? [];
  if (removers.length === 0) {
    return [];
  }
  const held = new Set(heldContentIds(character.document));
  const owned = removers.filter(({ entry }) => held.has(entry.id));
  if (owned.length === 0) {
    return [];
  }
  const views = countedViews(registry, character, character.document.play.resources);
  const options = owned.map((remover) => optionOf(remover, availability(remover.entry, character, views)));
  return [...options.filter(({ available }) => available), ...options.filter(({ available }) => !available)];
}
