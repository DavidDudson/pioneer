import { rollSetups } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { RuleId, StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentRegistry, Selector } from '@pioneer/rules/sdk';
import type { NamedStatistic, StatisticSituations } from '@pioneer/rules/ui';

import { sheetSources } from './sheet-sources';
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

/** A check derived again with its claimed situations counted, and the conditional lines it offers to claim. */
export interface CheckSituations {
  readonly statistic: StatisticValue;
  readonly situations: StatisticSituations;
}

/**
 * The checks among `selectors` derived again with the situations `claims` holds for each counted, and the conditional
 * lines each offers to claim (`rollSetups`). A check with nothing to claim is left out.
 */
export function checkSituations(
  registry: ContentRegistry,
  character: Character,
  { selectors, claims }: { readonly selectors: readonly Selector[]; readonly claims: SituationClaims },
): ReadonlyMap<Selector, CheckSituations> {
  const sources = sheetSources(registry, character);
  const wanted = new Map(
    selectors.map((selector): [Selector, ReadonlySet<RuleId>] => [selector, claims.get(selector) ?? new Set()]),
  );
  const setups = rollSetups(character.document, sources, {
    derived: sheetDerivation(registry, character),
    claims: wanted,
  });
  const found = [...setups].flatMap(([selector, { statistic, conditional }]): [Selector, CheckSituations][] =>
    conditional.length === 0
      ? []
      : [[selector, { statistic, situations: { offered: conditional, claimed: wanted.get(selector) ?? new Set() } }]],
  );
  return new Map(found);
}

/**
 * The checks among `statistics` with the situations claimed for each counted in their totals and breakdowns, and
 * the conditional lines each offers to claim. A statistic with nothing to claim comes back as it was.
 */
export function withSituations(
  registry: ContentRegistry,
  character: Character,
  { statistics, claims }: SituationsRequest,
): readonly NamedStatistic[] {
  const selectors = statistics
    .filter(({ kind, result }) => kind === StatisticKind.Check && result.ok)
    .map(({ result }) => result.selector);
  const found = checkSituations(registry, character, { selectors, claims });
  return statistics.map((statistic) => {
    const check = found.get(statistic.result.selector);
    return check === undefined ? statistic : { ...statistic, result: check.statistic, situations: check.situations };
  });
}
