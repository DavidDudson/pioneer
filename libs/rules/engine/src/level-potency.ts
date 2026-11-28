import { Truth } from '@pioneer/rules/predicate';
import { Modifier, ModifierType, RuleElementKey, Selector } from '@pioneer/rules/sdk';

import type { ModifierInputs } from './rule-in-play';
import { truthOf } from './rule-value';

/** The selector of every Strike's attack roll, which Automatic Bonus Progression's potency bonus targets. */
const STRIKE_ATTACK = Selector.parse('strike-attack-roll');

/** What no rule gives. */
const NONE = Modifier.parse(0);

/**
 * The potency bonus the rules in play give Strike attack rolls whatever the weapon, which is what Automatic
 * Bonus Progression adds by level: the highest numeric `potency` `FlatModifier` on `strike-attack-roll` whose predicate
 * holds. None when no rule applies.
 */
export function levelPotency({ rules, facts }: ModifierInputs): Modifier {
  const bonuses = rules.flatMap(({ element }): Array<Modifier> => {
    if (
      element.key !== RuleElementKey.FlatModifier ||
      element.type !== ModifierType.Potency ||
      !element.selectors.includes(STRIKE_ATTACK) ||
      truthOf(element.predicate, facts) !== Truth.True
    ) {
      return [];
    }

    const bonus = Modifier.safeParse(element.value);

    return bonus.success ? [bonus.data] : [];
  });

  return Modifier.parse(Math.max(NONE, ...bonuses));
}
