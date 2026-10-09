import { FormulaValue } from '@pioneer/rules/formula';
import { PredicateFacts } from '@pioneer/rules/predicate';
import type { Selector, StatisticDefinition } from '@pioneer/rules/sdk';

import { LineStatusKind } from './breakdown';
import type { BreakdownLine } from './breakdown';
import { collectLines } from './collect';
import type { CollectContext } from './collect';
import { modifierRules } from './modifier';
import type { RuleInPlay } from './rule-in-play';
import { StatisticBases, totalOutOfRange } from './statistic-bases';
import type { StatisticResult } from './statistic-bases';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

/** The rule elements in play and the roll options their predicates are tested against. */
export interface ModifierInputs {
  readonly rules: readonly RuleInPlay[];
  readonly facts: PredicateFacts;
}

const NO_MODIFIERS: ModifierInputs = { rules: [], facts: new PredicateFacts([]) };

/**
 * The base result with its lines, its total the base plus every applied line. A failed statistic has no lines, and
 * one whose lines add up past the safe integer range fails rather than throwing.
 */
function withLines(result: StatisticResult, lines: readonly BreakdownLine[]): StatisticResult {
  if (!result.ok) {
    return result;
  }
  let sum = 0;
  for (const { status, value } of lines) {
    if (status.kind === LineStatusKind.Applied && value !== undefined) {
      sum += value;
    }
  }
  const total = FormulaValue.safeParse(result.baseValue + sum);
  return total.success ? { ...result, lines, total: total.data } : totalOutOfRange(result.selector);
}

/**
 * Every statistic's breakdown (rules-engine.md, steps 5 and 6). The base phase evaluates each base formula in
 * dependency order (`StatisticBases`); the modifier phase then collects the modifiers that reach each statistic,
 * gates them by predicate and stacks them (`collectLines`). Modifier formulas read the inputs, statistics' bases
 * through `@stat.<selector>`, and the level of the item they are on. Never throws: a statistic's failure, or a
 * line's, is reported in the result. The result does not depend on the order of the definitions or rules, except
 * that a later definition of a selector replaces an earlier one.
 */
export function deriveStatistics(
  definitions: readonly StatisticDefinition[],
  inputs: StatisticInputs,
  modifiers: ModifierInputs = NO_MODIFIERS,
): ReadonlyMap<Selector, StatisticResult> {
  const bases = new StatisticBases(definitions, inputs);
  const rules = modifierRules(modifiers.rules);
  const context: CollectContext = {
    facts: modifiers.facts,
    resolve: (itemLevel) => resolverFor(inputs, (selector) => bases.baseValue(selector), itemLevel),
  };
  return new Map(
    bases.bases.map(({ definition, result }) => [
      definition.selector,
      withLines(result, collectLines(definition, rules, context)),
    ]),
  );
}
