import {
  characterCounted,
  abilityFrequencies,
  characterGrants,
  characterSpellcasting,
  heldCount,
  slotCountKey,
} from '@pioneer/character/domain';
import type { Boundary, Character, ResourcesSpent, SlotCountKey, UseCountKey } from '@pioneer/character/domain';
import type { ContentRegistry, Origin, SpellRank } from '@pioneer/rules/sdk';

import { sheetSlotContent } from './sheet-slot-content';

/** The spell slots of one rank of an entry or of one of its pools, as the sheet shows them. */
export interface SlotView {
  readonly key: SlotCountKey;
  /** The name of the entry that gave the spellcasting; a pool's name follows it when the slots are a pool's. */
  readonly source: string;
  readonly pool: string | undefined;
  readonly rank: SpellRank;
  readonly current: number;
  readonly max: number;
}

/** The uses of one feat or action with a frequency, as the sheet shows them. */
export interface UseView {
  readonly key: UseCountKey;
  readonly name: string;
  readonly boundary: Boundary;
  readonly current: number;
  readonly max: number;
}

/** Every counted resource the character has, with what is held of each. */
export interface CountedViews {
  readonly slots: readonly SlotView[];
  readonly uses: readonly UseView[];
}

/** The slots by entry, pool and rank and the uses by ability, each with what is held after `spent`. */
export function countedViews(registry: ContentRegistry, character: Character, spent: ResourcesSpent): CountedViews {
  const content = sheetSlotContent(registry);
  const grants = characterGrants(character.document, content);
  const counted = characterCounted(grants, abilityFrequencies(registry));
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
  const uses = grants.items.flatMap(({ entry }): UseView[] => {
    const maximum = counted.uses.get(entry.id);
    return maximum === undefined
      ? []
      : [
          {
            key: entry.id,
            name: entry.name,
            boundary: maximum.boundary,
            current: heldCount({ spent: spent.uses, maxima: counted.uses, key: entry.id }),
            max: maximum.max,
          },
        ];
  });
  return { slots, uses };
}
