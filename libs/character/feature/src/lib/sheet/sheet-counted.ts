import {
  characterCounted,
  abilityFrequencies,
  characterGrants,
  characterSpellcasting,
  heldCount,
  itemActivations,
  itemWands,
  itemContent,
  slotCountKey,
  activationUseKey,
  overchargeUseKey,
  abilityUseKey,
} from '@pioneer/character/domain';
import type {
  Boundary,
  Character,
  CountedMaxima,
  InventoryItemId,
  ResourcesSpent,
  SlotCountKey,
  UseCountKey,
} from '@pioneer/character/domain';
import type { Activation, ContentId, ContentRegistry, Origin, Slug, SpellRank } from '@pioneer/rules/sdk';

import { sheetSlotContent } from './sheet-slot-content';

/** The spell slots of one rank of an entry or of one of its pools, as the sheet shows them. */
interface SlotView {
  readonly key: SlotCountKey;
  /** The name of the entry that gave the spellcasting; a pool's name follows it when the slots are a pool's. */
  readonly source: string;
  readonly pool: string | undefined;
  readonly rank: SpellRank;
  readonly current: number;
  readonly max: number;
}

/** The uses of one feat or action with a frequency, as the sheet shows them. */
interface UseView {
  readonly key: UseCountKey;
  readonly name: string;
  readonly boundary: Boundary;
  /** Whether this is the one extra use an activation allows beyond its frequency. */
  readonly overcharge: boolean;
  readonly current: number;
  readonly max: number;
}

/** Every counted resource the character has, with what is held of each. */
export interface CountedViews {
  readonly slots: readonly SlotView[];
  readonly uses: readonly UseView[];
}

/** What the uses of one character are read from. */
interface UseSource {
  readonly counted: CountedMaxima;
  readonly spent: ResourcesSpent;
  readonly activations: ReadonlyMap<ContentId, readonly Activation[]>;
}

/** The use to show: the key it is counted under, the name to show it by and whether it is an overcharged one. */
type UseTarget = Pick<UseView, 'key' | 'name' | 'overcharge'>;

/** What is held of the use counted under `key`, if the build or content gives it a maximum. */
function useView({ counted, spent }: UseSource, { key, name, overcharge }: UseTarget): UseView[] {
  const maximum = counted.uses.get(key);
  return maximum === undefined
    ? []
    : [
        {
          key,
          name,
          boundary: maximum.boundary,
          overcharge,
          current: heldCount({ spent: spent.uses, maxima: counted.uses, key }),
          max: maximum.max,
        },
      ];
}

/** An activation of one inventory item and the name to show its uses by. */
interface ActivationOnItem {
  readonly item: InventoryItemId;
  readonly slug: Slug;
  readonly name: string;
}

/** The daily uses of an activation, then its overcharged use if it has one. */
function activationUses(used: UseSource, { item, slug, name }: ActivationOnItem): UseView[] {
  const daily = useView(used, { key: activationUseKey(item, slug), name, overcharge: false });
  const overcharged = useView(used, { key: overchargeUseKey(item, slug), name, overcharge: true });
  return [...daily, ...overcharged];
}

/** The uses of each activation with a frequency on the character's items, named by the item and the activation. */
function activationViews(registry: ContentRegistry, character: Character, used: UseSource): UseView[] {
  const itemEntries = itemContent(registry);
  return character.document.inventory.items.flatMap((item) =>
    (used.activations.get(item.item) ?? []).flatMap(({ slug, name }) => {
      const itemName = item.name ?? itemEntries.get(item.item)?.name ?? name;
      const label = itemName === name ? name : `${itemName}: ${name}`;
      return activationUses(used, { item: item.id, slug, name: label });
    }),
  );
}

/** The most each slot and use of the character holds, as the build and the content give them. */
export function sheetCounted(registry: ContentRegistry, character: Character): CountedMaxima {
  const grants = characterGrants(character.document, sheetSlotContent(registry));
  const { items } = character.document.inventory;
  return characterCounted(grants, abilityFrequencies(registry), {
    items,
    activations: itemActivations(registry),
    wands: itemWands(registry),
  });
}

/** The slots by entry, pool and rank and the uses by ability, each with what is held after `spent`. */
export function countedViews(registry: ContentRegistry, character: Character, spent: ResourcesSpent): CountedViews {
  const content = sheetSlotContent(registry);
  const grants = characterGrants(character.document, content);
  const activations = itemActivations(registry);
  const counted = sheetCounted(registry, character);
  const nameOf = (origin: Origin): string => content.lookup.entry(origin.entry)?.name ?? origin.entry;
  const slotView = ({ key, source, pool, rank }: Omit<SlotView, 'current' | 'max'>): SlotView => ({
    key,
    source,
    pool,
    rank,
    current: heldCount({ spent: spent.slots, maxima: counted.slots, key }),
    max: counted.slots.get(key)?.max ?? 0,
  });
  const slots = characterSpellcasting(grants).flatMap((entry) => {
    const source = nameOf(entry.origin);
    const own = entry.slots.ranks.map(({ rank }) =>
      slotView({ key: slotCountKey(entry.slug, undefined, rank), source, pool: undefined, rank }),
    );
    const pooled = entry.pools.flatMap(({ pool, ranks }) =>
      ranks.map(({ rank }) => slotView({ key: slotCountKey(entry.slug, pool, rank), source, pool, rank })),
    );
    return [own, pooled].flat();
  });
  const source: UseSource = { counted, spent, activations };
  const abilityUses = grants.items.flatMap(({ entry }) =>
    useView(source, { key: abilityUseKey(entry.id), name: entry.name, overcharge: false }),
  );
  const itemUses = activationViews(registry, character, source);
  return { slots, uses: [...abilityUses, ...itemUses] };
}
