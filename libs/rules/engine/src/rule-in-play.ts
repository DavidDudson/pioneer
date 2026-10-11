import { PredicateFacts } from '@pioneer/rules/predicate';
import { ConditionValue, Level, Origin, RuleElement, RuleIndex } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * A rule element on the character: the element, where it came from, its position in its entry's `rules`, the level of
 * the item it sits on when it is on an item (`@item.level`), and the value of the condition it sits on when that
 * condition carries one (`@item.value`, 2 on Frightened 2). Grant resolution (Epic 1.4) will produce these; for now
 * they are supplied directly.
 */
export const RuleInPlay = z.strictObject({
  element: RuleElement,
  origin: Origin,
  rule: RuleIndex,
  itemLevel: Level.optional(),
  conditionValue: ConditionValue.optional(),
});
export type RuleInPlay = z.output<typeof RuleInPlay>;

/** What `@item` references read: the level of the item a rule element is on, and the value of the condition it is on. */
export interface ItemScope {
  readonly level: Level | undefined;
  readonly value: ConditionValue | undefined;
}

/** The scope of a rule element on no item: a statistic's own formula, or a line the engine makes itself. */
export const NO_ITEM: ItemScope = { level: undefined, value: undefined };

export function itemScopeOf({ itemLevel, conditionValue }: RuleInPlay): ItemScope {
  return { level: itemLevel, value: conditionValue };
}

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

/** No rules, so no predicate reads the facts or their namespace table. */
export const NO_MODIFIERS: ModifierInputs = { rules: [], facts: new PredicateFacts([], new Map()) };
