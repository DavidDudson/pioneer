import { rollSetups } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { RuleId } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentRegistry, Selector } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetDerivation } from './sheet-statistics';

/** The situations the player has claimed for the next roll of each statistic. */
export type SituationClaims = ReadonlyMap<Selector, ReadonlySet<RuleId>>;

/** No situation claimed anywhere. */
export const NO_CLAIMS: SituationClaims = new Map();

/** A situation claimed for the next roll of a statistic, or let go of. */
export interface SituationClaim {
  readonly selector: Selector;
  readonly rule: RuleId;
  readonly on: boolean;
}

/** `claims` with `claim` made; a statistic left with none drops out. */
export function claimSituation(claims: SituationClaims, { selector, rule, on }: SituationClaim): SituationClaims {
  const rules = new Set(claims.get(selector));
  if (on) {
    rules.add(rule);
  } else {
    rules.delete(rule);
  }
  const next = new Map(claims);
  if (rules.size === 0) {
    next.delete(selector);
  } else {
    next.set(selector, rules);
  }
  return next;
}

/** The statistics to count the claims in, and the situations claimed for each. */
export interface SituationsRequest {
  readonly statistics: readonly NamedStatistic[];
  readonly claims: SituationClaims;
}

/**
 * The checks among `statistics` with the situations claimed for each counted in their totals and breakdowns, and
 * the conditional lines each offers to claim (`rollSetups`). A statistic with nothing to claim comes back as it was.
 */
export function withSituations(
  registry: ContentRegistry,
  character: Character,
  { statistics, claims }: SituationsRequest,
): readonly NamedStatistic[] {
  const checks = statistics.filter(({ kind, result }) => kind === StatisticKind.Check && result.ok);
  const sources = { registry, slots: sheetSlotContent(registry), inputs: statisticInputsOf(registry, character) };
  const wanted = new Map(
    checks.map(({ result }): [Selector, ReadonlySet<RuleId>] => [
      result.selector,
      claims.get(result.selector) ?? new Set(),
    ]),
  );
  const setups = rollSetups(character.document, sources, {
    derived: sheetDerivation(registry, character),
    claims: wanted,
  });
  return statistics.map((statistic) => {
    const setup = setups.get(statistic.result.selector);
    if (setup === undefined || setup.conditional.length === 0) {
      return statistic;
    }
    const claimed = wanted.get(statistic.result.selector) ?? new Set<RuleId>();
    return { ...statistic, result: setup.statistic, situations: { offered: setup.conditional, claimed } };
  });
}
