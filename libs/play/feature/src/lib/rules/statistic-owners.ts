import type { StatisticResult } from '@pioneer/rules/engine';
import type { Selector, StatisticDefinition } from '@pioneer/rules/sdk';

const INSTANCE_SEPARATOR = ':';

/**
 * A definition's results: its own, or for one derived per source, each source's `<selector>:<slug>`, in the order
 * the engine gives them. A slug has no colon, so a deeper selector is not one of them. A plain statistic may claim
 * one of these too (`strike:longsword`).
 */
function resultsOf(
  { selector, per }: StatisticDefinition,
  results: ReadonlyMap<Selector, StatisticResult>,
): readonly StatisticResult[] {
  if (per === undefined) {
    const result = results.get(selector);
    return result === undefined ? [] : [result];
  }
  const prefix = `${selector}${INSTANCE_SEPARATOR}`;
  return [...results].flatMap(([key, result]) =>
    key.startsWith(prefix) && !key.slice(prefix.length).includes(INSTANCE_SEPARATOR) ? [result] : [],
  );
}

/** A result and the definition it shows under, whose base its caret points into. */
export interface OwnedResult {
  readonly definition: StatisticDefinition;
  readonly result: StatisticResult;
}

/**
 * Each result under the definition that owns it, in the order the statistics were written in; a selector written
 * twice shows once, and a statistic derived per source shows each weapon's or entry's in turn. A result belongs to
 * the definition that claims it last, as the engine lets the later of an instance and a plain statistic sharing a
 * selector win.
 */
export function ownedResults(
  definitions: readonly StatisticDefinition[],
  results: ReadonlyMap<Selector, StatisticResult>,
): readonly OwnedResult[] {
  const owners = new Map<Selector, StatisticDefinition>();
  for (const definition of definitions) {
    for (const result of resultsOf(definition, results)) {
      owners.set(result.selector, definition);
    }
  }
  const latest = new Map(definitions.map((definition) => [definition.selector, definition]));
  return [...latest.values()].flatMap((definition) =>
    resultsOf(definition, results)
      .filter((result) => owners.get(result.selector) === definition)
      .map((result) => ({ definition, result })),
  );
}
