import { PredicateFacts } from '@pioneer/rules/predicate';
import { Level, Origin, RuleElement, RuleIndex } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * A rule element on the character: the element, where it came from, its position in its entry's `rules`, and the
 * level of the item it sits on when it is on an item (`@item.level`). Grant resolution (Epic 1.4) will produce
 * these; for now they are supplied directly.
 */
export const RuleInPlay = z.strictObject({
  element: RuleElement,
  origin: Origin,
  rule: RuleIndex,
  itemLevel: Level.optional(),
});
export type RuleInPlay = z.output<typeof RuleInPlay>;

/** A rule element in play, named by its entry and its position there: `<entry>#<rule>`. Stable across derivations. */
export const RuleId = z.string().brand<'RuleId'>();
export type RuleId = z.infer<typeof RuleId>;

export function ruleIdOf({ origin, rule }: RuleInPlay): RuleId {
  return RuleId.parse(`${origin.entry}#${rule}`);
}

/** The rule elements in play and the roll options their predicates are tested against. */
export interface ModifierInputs {
  readonly rules: readonly RuleInPlay[];
  readonly facts: PredicateFacts;
}

export const NO_MODIFIERS: ModifierInputs = { rules: [], facts: new PredicateFacts([]) };
