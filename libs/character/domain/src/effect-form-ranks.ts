import { isPredicateComparison, RollOption, RuleElementKey, SpellRank } from '@pioneer/rules/sdk';
import type { PredicateStatement, RuleElement } from '@pioneer/rules/sdk';

/**
 * The fact Foundry's effects test the rank of the spell that made them against (`{ "gte": [<this>, 5] }`). The sheet
 * reads it from the rank an effect is applied at, which only a gate on a choice needs: a `Change` or a formula reads
 * the rank as `@item.level`.
 */
const ORIGIN_RANK = RollOption.parse('parent:origin:item:level');

/** The lowest rank a statement asks the spell to be cast at; undefined when it asks nothing of the rank. */
function rankOf(statement: PredicateStatement): SpellRank | undefined {
  if (!isPredicateComparison(statement) || !('gte' in statement)) {
    return undefined;
  }
  const [fact, bound] = statement.gte;
  const rank = SpellRank.safeParse(bound);
  return fact === ORIGIN_RANK && rank.success ? rank.data : undefined;
}

/**
 * The lowest rank each form of an effect's `ChoiceSet` can be picked at, by the roll option picking it
 * (`humanoid-form:large`). A form with no gate on the rank is left out, and so is a gate that is not a plain `gte`
 * on the rank of the spell.
 */
export function formRanks(rules: readonly RuleElement[]): ReadonlyMap<RollOption, SpellRank> {
  const ranks = new Map<RollOption, SpellRank>();
  for (const rule of rules) {
    if (rule.key === RuleElementKey.ChoiceSet && rule.rollOption !== undefined && Array.isArray(rule.choices)) {
      const { rollOption } = rule;
      for (const { value, predicate } of rule.choices) {
        const rank = predicate?.map((statement) => rankOf(statement)).find((each) => each !== undefined);
        if (rank !== undefined) {
          ranks.set(RollOption.parse(`${rollOption}:${value}`), rank);
        }
      }
    }
  }
  return ranks;
}
