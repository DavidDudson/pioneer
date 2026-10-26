import { PredicateFacts } from '@pioneer/rules/predicate';
import { ConditionValue, Level, Origin, RuleElement, RuleIndex } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * A rule element on the character: the element, where it came from, its position in its entry's `rules`, the level of
 * the item it sits on when it is on an item (`@item.level`), and the value of the condition it sits on when that
 * condition carries one (`@item.value`, 2 on Frightened 2), and the level of what applied it when it is on an effect
 * (`@item.origin.level`). Grant resolution (Epic 1.4) will produce these; for now
 * they are supplied directly.
 */
export const RuleInPlay = z.strictObject({
  element: RuleElement,
  origin: Origin,
  rule: RuleIndex,
  itemLevel: Level.optional(),
  conditionValue: ConditionValue.optional(),
  originLevel: Level.optional(),
});
export type RuleInPlay = z.output<typeof RuleInPlay>;

/**
 * What `@item` references read: the level of the item a rule element is on, the value of the condition it is on, and
 * the level of what applied it.
 */
export interface ItemScope {
  readonly level: Level | undefined;
  readonly value: ConditionValue | undefined;
  readonly originLevel: Level | undefined;
}

/** The scope of a rule element on no item: a statistic's own formula, or a line the engine makes itself. */
export const NO_ITEM: ItemScope = { level: undefined, value: undefined, originLevel: undefined };

export function itemScopeOf({ itemLevel, conditionValue, originLevel }: RuleInPlay): ItemScope {
  return { level: itemLevel, value: conditionValue, originLevel };
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
  /**
   * The rules whose situation a roll says holds: a modifier or adjustment whose predicate depends on facts nobody
   * supplied counts as holding when it is here. One whose predicate is known to be false stays out. None when absent.
   */
  readonly situation?: ReadonlySet<RuleId>;
}

/** No rule's situation is chosen: every predicate that depends on the situation stays conditional. */
export const NO_SITUATION: ReadonlySet<RuleId> = new Set();

/** No rules, so no predicate reads the facts or their namespace table. */
export const NO_MODIFIERS: ModifierInputs = { rules: [], facts: new PredicateFacts([], new Map()) };
