import { evaluate, FormulaText, FormulaValue, parseFormula } from '@pioneer/rules/formula';
import type { ResolveReference } from '@pioneer/rules/formula';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { Truth } from '@pioneer/rules/predicate';
import { knownReference, Proficiency, ReferenceKind, RuleElementKey } from '@pioneer/rules/sdk';
import type { Level, Origin, ProficiencyBonusFormula, ProficiencyBonusTable } from '@pioneer/rules/sdk';

import { DEFAULT_PRIORITY } from './modifier';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { truthOf } from './rule-value';

/**
 * What `@prof.<selector>` reads: each rank's bonus at the character's level, and, when a rule element in play
 * replaced the content's table (a variant rule), that element's origin, so the breakdown can name it.
 */
export interface ProficiencyBonuses {
  readonly bonuses: ReadonlyMap<Proficiency, FormulaValue>;
  readonly origin: Origin | undefined;
}

/** The table in force and where it came from: the content's own, or a `ProficiencyBonus` element in play. */
interface TableInForce {
  readonly table: ProficiencyBonusTable;
  readonly origin: Origin | undefined;
}

/**
 * The `ProficiencyBonus` element in play that replaces the table: of those whose predicate holds, the last by
 * priority and then id, as set overrides pick their winner. One that depends on the situation does not apply,
 * since a sheet cannot show every statistic two ways.
 */
function replacement(rules: readonly RuleInPlay[], facts: PredicateFacts): TableInForce | undefined {
  const candidates = rules.flatMap((rule) =>
    rule.element.key === RuleElementKey.ProficiencyBonus && truthOf(rule.element.predicate, facts) === Truth.True
      ? [{ rule, table: rule.element.table, priority: rule.element.priority ?? DEFAULT_PRIORITY, id: ruleIdOf(rule) }]
      : [],
  );
  const winner = candidates
    .toSorted(
      (left, right) => left.priority - right.priority || Number(left.id > right.id) - Number(left.id < right.id),
    )
    .at(-1);
  return winner === undefined ? undefined : { table: winner.table, origin: winner.rule.origin };
}

/** What picks and evaluates the table: the rule elements in play, the facts their predicates read, the level. */
interface BonusInputs {
  readonly rules: readonly RuleInPlay[];
  readonly facts: PredicateFacts;
  readonly level: Level;
}

/** A rank's formula at `level`; undefined when it fails to evaluate, so `@prof` reads as unknown. */
function bonusAt(formula: ProficiencyBonusFormula, level: Level): FormulaValue | undefined {
  const parsed = parseFormula(FormulaText.parse(formula));
  if (!parsed.ok) {
    return undefined;
  }
  const resolve: ResolveReference = (path) =>
    knownReference(path)?.kind === ReferenceKind.Level ? FormulaValue.parse(level) : undefined;
  const outcome = evaluate(parsed.formula, resolve);
  return outcome.ok ? outcome.value : undefined;
}

/**
 * Every rank's bonus at `level`, from `table` (the core rules pack's, through the registry) unless a
 * `ProficiencyBonus` element in play replaces it (ADR-0026). Evaluated once per derivation.
 */
export function proficiencyBonuses(
  table: ProficiencyBonusTable,
  { rules, facts, level }: BonusInputs,
): ProficiencyBonuses {
  const inForce = replacement(rules, facts) ?? { table, origin: undefined };
  const bonuses = new Map<Proficiency, FormulaValue>();
  for (const rank of Object.values(Proficiency)) {
    const bonus = bonusAt(inForce.table[rank], level);
    if (bonus !== undefined) {
      bonuses.set(rank, bonus);
    }
  }
  return { bonuses, origin: inForce.origin };
}
