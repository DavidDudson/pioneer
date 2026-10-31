import type { ResolveReference } from '@pioneer/rules/formula';
import type { ProficiencyBonusTable, Selector, StatisticDefinition } from '@pioneer/rules/sdk';

import { armorBonus } from './armor-bonus';
import { applyForm, battleFormInPlay } from './battle-form';
import { changeRules } from './change';
import { collectLines } from './collect';
import { modifierRules } from './modifier';
import { applyMovementCost, movementCostsInPlay } from './movement-cost';
import { proficiencyBonuses } from './proficiency-bonuses';
import { NO_ITEM, NO_MODIFIERS, NO_SITUATION } from './rule-in-play';
import type { ItemScope, ModifierInputs } from './rule-in-play';
import { StatisticBases } from './statistic-bases';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { finished } from './totals';
import { weaponPotencies } from './weapon-potency';

/** The content a derivation reads: the statistic definitions and the proficiency bonus table, from the registry. */
export interface StatisticContent {
  readonly definitions: readonly StatisticDefinition[];
  readonly proficiencyBonus: ProficiencyBonusTable;
}

/**
 * Every statistic's breakdown (rules-engine.md, steps 4 to 6). The base phase evaluates each base formula in
 * dependency order and runs its `Change`s (`StatisticBases`); the modifier phase then collects the modifiers that
 * reach each statistic, gates them by predicate and stacks them (`collectLines`); last, set overrides may pin the
 * total. A battle form in play then replaces what it sets (`applyForm`), and terrain that costs movement lowers the Speeds it reaches (`applyMovementCost`). Each weapon's potency joins the modifiers
 * as an `item` line on its Strike (`weaponPotencies`), and worn
 * armour's bonus as an `item` line on AC (`armorBonus`). A modifier or adjustment in `situation` whose predicate
 * depends on facts nobody supplied counts as holding, as the toggles chosen on a roll say. Modifier
 * formulas read the inputs, statistics' bases through `@stat.<selector>`, and the level of the item they are on.
 * `@prof.<selector>` reads the proficiency bonus table, unless a `ProficiencyBonus` element in play (a variant rule)
 * replaces it. Never throws: a statistic's failure, or a line's, is reported in the result. The result does not
 * depend on the order of the definitions or rules, except that a later definition of a selector replaces an
 * earlier one.
 */
export function deriveStatistics(
  { definitions, proficiencyBonus }: StatisticContent,
  inputs: StatisticInputs,
  { rules, facts, situation = NO_SITUATION }: ModifierInputs = NO_MODIFIERS,
): ReadonlyMap<Selector, StatisticResult> {
  const changes = changeRules(rules);
  const values = { inputs, proficiency: proficiencyBonuses(proficiencyBonus, { rules, facts, level: inputs.level }) };
  const bases = new StatisticBases(definitions, values, { changes: changes.base, facts });
  const fromRules = modifierRules(rules);
  const synthetic = [...weaponPotencies(inputs.weapons ?? []), ...armorBonus(inputs.armor, inputs.attributes)];
  const modifiers = { ...fromRules, modifiers: [...fromRules.modifiers, ...synthetic] };
  const context = {
    facts,
    resolve: (item: ItemScope): ResolveReference =>
      resolverFor(values, (selector) => bases.baseValue(selector), { item }),
  };
  const form = battleFormInPlay({ rules, facts });
  const costs = movementCostsInPlay({ rules, facts });
  return new Map(
    bases.bases.map(({ definition, result }) => {
      const lines = collectLines(definition, modifiers, { ...context, situation });
      const sets = changes.set.get(definition.selector) ?? [];
      const finishedResult = finished(result, { lines, sets, context });
      const formed = applyForm(finishedResult, form, context.resolve(NO_ITEM));
      return [definition.selector, applyMovementCost(formed, costs)];
    }),
  );
}
