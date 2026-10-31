import type { DamageTags, DiceExpression, Term } from '@pioneer/rules/dice';
import { FormulaText } from '@pioneer/rules/formula';
import type { DamageInstance, DamageNode } from '@pioneer/rules/sdk';

import { resolveDamageFormula } from './resolve-damage-formula';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

/** A damage node as the dice to roll, or the text of the instance whose formula has no value. */
export type ResolvedDamageNode =
  { readonly ok: true; readonly expression: DiceExpression } | { readonly ok: false; readonly unresolved: FormulaText };

const REFERENCE = '@';

/** Inputs for a formula with no references, which reads none of them. */
const NO_INPUTS: StatisticInputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

/** `term` as damage of the instance's type and category, which its text gives once for all its terms. */
function tagged(term: Term, { damageType, category }: DamageInstance): Term {
  const tags: DamageTags = {
    ...(damageType === undefined ? {} : { type: damageType }),
    ...(category === undefined ? {} : { category }),
  };
  return { ...term, tags };
}

/**
 * The dice a damage node rolls: each instance's formula read against the character (`@attr.str`), then every term of
 * it tagged with the instance's type and category, so a roll of `2d6 fire plus 1d6 persistent fire` keeps both apart.
 * Without a character (`inputs` unset) only a formula with no references resolves. Never throws.
 */
export function resolveDamageNode(node: DamageNode, inputs: StatisticInputs | undefined): ResolvedDamageNode {
  const terms: Term[] = [];
  for (const instance of node.instances) {
    if (inputs === undefined && instance.formula.includes(REFERENCE)) {
      return { ok: false, unresolved: FormulaText.parse(instance.formula) };
    }
    const resolved = resolveDamageFormula(instance.formula, inputs ?? NO_INPUTS);
    if (!resolved.ok) {
      return { ok: false, unresolved: resolved.unresolved };
    }
    terms.push(...resolved.expression.terms.map((term) => tagged(term, instance)));
  }
  const [first, ...rest] = terms;
  return first === undefined
    ? { ok: false, unresolved: FormulaText.parse('0') }
    : { ok: true, expression: { terms: [first, ...rest] } };
}
