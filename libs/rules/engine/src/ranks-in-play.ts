import { Truth } from '@pioneer/rules/predicate';
import { Proficiency, RuleElementKey, Selector } from '@pioneer/rules/sdk';
import type { MagicTradition, RuleElement } from '@pioneer/rules/sdk';

import type { ModifierInputs } from './rule-in-play';
import { truthOf } from './rule-value';

const RANK_ORDER: readonly Proficiency[] = Object.values(Proficiency);

function higher(left: Proficiency | undefined, right: Proficiency): Proficiency {
  return left === undefined || RANK_ORDER.indexOf(right) > RANK_ORDER.indexOf(left) ? right : left;
}

/** The selector a tradition's spell attacks and DCs read their rank from: `spellcasting:<tradition>`. */
export function spellcastingSelector(tradition: MagicTradition): Selector {
  return Selector.parse(`spellcasting:${tradition}`);
}

/** A raise an element makes, if it makes one. */
interface Raise {
  readonly selector: Selector;
  readonly rank: Proficiency;
}

/** A `Proficiency` element raises its selector; a `SpellcastingEntry` makes the character trained in its tradition. */
function raiseOf(element: RuleElement): Raise | undefined {
  if (element.key === RuleElementKey.Proficiency) {
    return { selector: element.selector, rank: element.rank };
  }
  if (element.key === RuleElementKey.SpellcastingEntry) {
    return { selector: spellcastingSelector(element.tradition), rank: Proficiency.Trained };
  }
  return undefined;
}

/**
 * The rank each selector reaches through the elements in play (rules-engine.md, step 4): the highest of those whose
 * predicate holds, so a class's starting rank and a feature's later raise compete and the raise wins. A `Proficiency`
 * element raises its selector, and a `SpellcastingEntry` makes the character trained in `spellcasting:<tradition>`
 * (ADR-0037). One that depends on the situation raises nothing on the sheet. The ranks `StatisticInputs` takes.
 */
export function ranksInPlay({ rules, facts }: ModifierInputs): ReadonlyMap<Selector, Proficiency> {
  const ranks = new Map<Selector, Proficiency>();
  for (const { element } of rules) {
    const raise = raiseOf(element);
    if (raise !== undefined && truthOf(element.predicate, facts) === Truth.True) {
      ranks.set(raise.selector, higher(ranks.get(raise.selector), raise.rank));
    }
  }
  return ranks;
}
