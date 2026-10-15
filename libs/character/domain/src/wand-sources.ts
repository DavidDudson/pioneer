import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { SpellPreparation } from '@pioneer/rules/sdk';

import { heldCount, wandOverchargeKey, wandUseKey } from './counted-resources';
import type { CountedMaxima, SpentCounts, UseCountKey } from './counted-resources';
import type { InventoryItem } from './inventory';
import type { ItemContent } from './inventory-content';
import { CarryState } from './item-carry';
import { ResourceCount } from './resource-count';
import type { SpellContent, SpellOption } from './spell-content';
import { castingEntry } from './staff-sources';
import type { StaffSpellProblem } from './staff-sources';
import { wandSpell } from './wand-items';
import type { WandSpell } from './wand-items';

const NONE = ResourceCount.parse(0);

/** What a wand has left of a count and the most it has. */
export interface WandCount {
  readonly left: ResourceCount;
  readonly max: ResourceCount;
}

/**
 * A wand the character holds as a spell source: the spell it casts, the entry that casts it, whether it is broken, and
 * what is left of the day's casts and of its one overcharge.
 */
export interface WandSource {
  readonly item: InventoryItem;
  readonly wand: WandSpell;
  /** The spell's content; undefined when it is not loaded. */
  readonly spell: SpellOption | undefined;
  /** The entry whose tradition lists the spell and casts its rank; undefined when the holder can't cast it. */
  readonly entry: SpellcastingInPlay | undefined;
  /** Why the holder can't cast the spell, or undefined when they can. */
  readonly problem: StaffSpellProblem | undefined;
  readonly broken: boolean;
  readonly use: WandCount;
  readonly overcharge: WandCount;
}

/** What the wands are read from: the inventory and its content, the spells, the spellcasting entries and the counts. */
export interface WandSourceInputs {
  readonly inventory: readonly InventoryItem[];
  readonly items: ItemContent;
  readonly spells: SpellContent;
  readonly entries: readonly SpellcastingInPlay[];
  readonly uses: SpentCounts['uses'];
  readonly counted: CountedMaxima;
}

function countOf(inputs: WandSourceInputs, key: UseCountKey): WandCount {
  return {
    left: heldCount({ spent: inputs.uses, maxima: inputs.counted.uses, key }),
    max: inputs.counted.uses.get(key)?.max ?? NONE,
  };
}

/**
 * The wands the character holds as spell sources (play-and-campaigns.md, "Staves and charged items"): each held wand
 * with its spell, whether the holder can cast it, and its casts left. A wand that is stowed, worn or dropped is no
 * source. Focus entries have no spell list to cast from and are left out.
 */
export function wandSources(inputs: WandSourceInputs): readonly WandSource[] {
  const casters = inputs.entries.filter(({ preparation }) => preparation !== SpellPreparation.Focus);
  return inputs.inventory.flatMap((item): WandSource[] => {
    const wand = wandSpell(item, inputs.items);
    if (wand === undefined || item.carry.state !== CarryState.Held) {
      return [];
    }
    return [
      {
        item,
        wand,
        ...castingEntry({
          id: wand.spell,
          rank: wand.rank,
          content: inputs.spells,
          entries: casters,
        }),
        broken: item.broken === true,
        use: countOf(inputs, wandUseKey(item.id)),
        overcharge: countOf(inputs, wandOverchargeKey(item.id)),
      },
    ];
  });
}
