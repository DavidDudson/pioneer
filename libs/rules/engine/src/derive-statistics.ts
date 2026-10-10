import type { ResolveReference } from '@pioneer/rules/formula';
import type { Level, Selector, StatisticDefinition } from '@pioneer/rules/sdk';

import { changeRules } from './change';
import { collectLines } from './collect';
import { modifierRules } from './modifier';
import { NO_MODIFIERS } from './rule-in-play';
import type { ModifierInputs } from './rule-in-play';
import { StatisticBases } from './statistic-bases';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { finished } from './totals';

/**
 * Every statistic's breakdown (rules-engine.md, steps 4 to 6). The base phase evaluates each base formula in
 * dependency order and runs its `Change`s (`StatisticBases`); the modifier phase then collects the modifiers that
 * reach each statistic, gates them by predicate and stacks them (`collectLines`); last, set overrides may pin the
 * total. Modifier formulas read the inputs, statistics' bases through `@stat.<selector>`, and the level of the item
 * they are on. Never throws: a statistic's failure, or a line's, is reported in the result. The result does not
 * depend on the order of the definitions or rules, except that a later definition of a selector replaces an
 * earlier one.
 */
export function deriveStatistics(
  definitions: readonly StatisticDefinition[],
  inputs: StatisticInputs,
  { rules, facts }: ModifierInputs = NO_MODIFIERS,
): ReadonlyMap<Selector, StatisticResult> {
  const changes = changeRules(rules);
  const bases = new StatisticBases(definitions, inputs, { changes: changes.base, facts });
  const modifiers = modifierRules(rules);
  const context = {
    facts,
    resolve: (itemLevel: Level | undefined): ResolveReference =>
      resolverFor(inputs, (selector) => bases.baseValue(selector), itemLevel),
  };
  return new Map(
    bases.bases.map(({ definition, result }) => {
      const lines = collectLines(definition, modifiers, context);
      const sets = changes.set.get(definition.selector) ?? [];
      return [definition.selector, finished(result, { lines, sets, context })];
    }),
  );
}
