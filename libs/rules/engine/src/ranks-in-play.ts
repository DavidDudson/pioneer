import { Truth } from '@pioneer/rules/predicate';
import { Proficiency, RuleElementKey } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';

import type { ModifierInputs } from './rule-in-play';
import { truthOf } from './rule-value';

const RANK_ORDER: readonly Proficiency[] = Object.values(Proficiency);

function higher(left: Proficiency | undefined, right: Proficiency): Proficiency {
  return left === undefined || RANK_ORDER.indexOf(right) > RANK_ORDER.indexOf(left) ? right : left;
}

/**
 * The rank each selector reaches through the `Proficiency` elements in play (rules-engine.md, step 4): the highest of
 * those whose predicate holds, so a class's starting rank and a feature's later raise compete and the raise wins. One
 * that depends on the situation raises nothing on the sheet. The ranks `StatisticInputs` takes.
 */
export function ranksInPlay({ rules, facts }: ModifierInputs): ReadonlyMap<Selector, Proficiency> {
  const ranks = new Map<Selector, Proficiency>();
  for (const { element } of rules) {
    if (element.key === RuleElementKey.Proficiency && truthOf(element.predicate, facts) === Truth.True) {
      ranks.set(element.selector, higher(ranks.get(element.selector), element.rank));
    }
  }
  return ranks;
}
