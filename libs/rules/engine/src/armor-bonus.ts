import { ModifierTarget, ModifierType, RuleSlug } from '@pioneer/rules/sdk';
import type { Modifier as ModifierAmount, Origin } from '@pioneer/rules/sdk';

import type { ModifierSource } from './modifier';
import { NO_ITEM, RuleId } from './rule-in-play';

/** Worn armour, as AC reads it. */
export interface ArmorInputs {
  /** Its item bonus to AC: the armour's own bonus and its potency rune's. */
  readonly bonus: ModifierAmount;
  /** Why the character wears it: its entry and the inventory hop that put it there. The line's origin and name. */
  readonly origin: Origin;
}

/** The core rules pack's Armor Class selector. */
const AC = ModifierTarget.parse('ac');

/** Lets an `AdjustModifier` find the armour's line, for anything that changes its bonus. */
const ARMOR_BONUS = RuleSlug.parse('armor-bonus');

/**
 * A synthetic `item` modifier to AC for worn armour's bonus, named by the armour, so it stacks with other item bonuses
 * to AC the way PF2e says (only the highest applies). No armour, or armour with no bonus (clothing), adds none.
 */
export function armorBonus(armor: ArmorInputs | undefined): readonly ModifierSource[] {
  if (armor === undefined || armor.bonus === 0) {
    return [];
  }
  return [
    {
      modifier: {
        id: RuleId.parse(`${armor.origin.entry}#${ARMOR_BONUS}`),
        slug: ARMOR_BONUS,
        label: { entry: armor.origin.entry },
        type: ModifierType.Item,
        targets: [AC],
        predicate: undefined,
        origin: armor.origin,
      },
      value: armor.bonus,
      item: NO_ITEM,
      summary: undefined,
    },
  ];
}
