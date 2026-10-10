import type { StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { StatisticPer } from '@pioneer/rules/sdk';
import type { Selector, StatisticDefinition } from '@pioneer/rules/sdk';

const INSTANCE_SEPARATOR = ':';

/** The slugs of the weapons or spellcasting entries a family derived `per` them has an instance for. */
function sourceSlugs(per: StatisticPer, inputs: StatisticInputs): ReadonlySet<string> {
  const sources = per === StatisticPer.Weapon ? (inputs.weapons ?? []) : (inputs.spellcasting ?? []);
  return new Set(sources.map(({ slug }) => slug));
}

/**
 * A definition's results: its own, or for one derived per source, each source's `<selector>:<slug>` for a source
 * the character has, in the order the engine gives them. A plain statistic may claim one of these too
 * (`strike:longsword`), but a plain `strike:custom` with no `custom` weapon is never the family's.
 */
function resultsOf(
  { selector, per }: StatisticDefinition,
  results: ReadonlyMap<Selector, StatisticResult>,
  inputs: StatisticInputs,
): readonly StatisticResult[] {
  if (per === undefined) {
    const result = results.get(selector);
    return result === undefined ? [] : [result];
  }
  const prefix = `${selector}${INSTANCE_SEPARATOR}`;
  const slugs = sourceSlugs(per, inputs);
  return [...results].flatMap(([key, result]) =>
    key.startsWith(prefix) && slugs.has(key.slice(prefix.length)) ? [result] : [],
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
  inputs: StatisticInputs,
): readonly OwnedResult[] {
  const owners = new Map<Selector, StatisticDefinition>();
  for (const definition of definitions) {
    for (const result of resultsOf(definition, results, inputs)) {
      owners.set(result.selector, definition);
    }
  }
  const latest = new Map(definitions.map((definition) => [definition.selector, definition]));
  return [...latest.values()].flatMap((definition) =>
    resultsOf(definition, results, inputs)
      .filter((result) => owners.get(result.selector) === definition)
      .map((result) => ({ definition, result })),
  );
}
