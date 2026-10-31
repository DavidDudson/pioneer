import type { FormulaValue } from '@pioneer/rules/formula';
import { Truth } from '@pioneer/rules/predicate';
import { FormMovement, RuleElementKey } from '@pioneer/rules/sdk';
import type { Feet } from '@pioneer/rules/sdk';

import { movementOf } from './battle-form';
import type { ModifierLabel } from './breakdown';
import { labelOf } from './modifier';
import { ruleIdOf } from './rule-in-play';
import type { ModifierInputs, RuleId, RuleInPlay } from './rule-in-play';
import { truthOf, whole } from './rule-value';
import type { MovementCostReduction, StatisticResult } from './statistic-result';

/** The size of one square of movement, in feet. */
const SQUARE = 5;

/** The land Speed, which a cost reaches unless the element names others. */
const LAND: readonly FormMovement[] = [FormMovement.Land];

/** A `MovementCost` element that holds: what each square costs beyond itself, the Speeds it reaches, and who named it. */
export interface MovementCostInPlay {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly extra: Feet;
  readonly movement: readonly FormMovement[];
}

function costOf(rule: RuleInPlay): MovementCostInPlay[] {
  const { element } = rule;
  return element.key === RuleElementKey.MovementCost
    ? [{ id: ruleIdOf(rule), label: labelOf(rule), extra: element.extra, movement: element.movement ?? LAND }]
    : [];
}

/** The `MovementCost` elements in play whose predicate holds; one that depends on the situation gives nothing. */
export function movementCostsInPlay({ rules, facts }: ModifierInputs): readonly MovementCostInPlay[] {
  return rules
    .filter(
      ({ element }) => element.key === RuleElementKey.MovementCost && truthOf(element.predicate, facts) === Truth.True,
    )
    .flatMap((rule) => costOf(rule));
}

/** The distance a Stride covers over terrain that costs `extra` more per square, for a Speed of `speed`. */
function covered(speed: FormulaValue, extra: Feet): FormulaValue | undefined {
  return whole(Math.floor(speed / (SQUARE + extra)) * SQUARE);
}

/**
 * The Speed as the terrain leaves it: the Speeds a `MovementCost` element names drop to the distance a Stride covers
 * (rules-engine.md, "Movement cost"), computed on the total, so every bonus to the Speed counts first. The costliest
 * element that reaches the Speed counts. A Speed a set override pinned, one that failed, and one the cost would not
 * lower stay as they are.
 */
export function applyMovementCost(result: StatisticResult, costs: readonly MovementCostInPlay[]): StatisticResult {
  const movement = movementOf(result.selector);
  if (!result.ok || movement === undefined || result.pinnedBy !== undefined) {
    return result;
  }
  const [worst] = costs
    .filter((cost) => cost.movement.includes(movement))
    .toSorted((left, right) => right.extra - left.extra);
  const value = worst === undefined ? undefined : covered(result.total, worst.extra);
  if (worst === undefined || value === undefined || value >= result.total) {
    return result;
  }
  const reduction: MovementCostReduction = {
    rule: worst.id,
    label: worst.label,
    extra: worst.extra,
    was: result.total,
  };
  return { ...result, computed: value, total: value, movementCost: reduction };
}
