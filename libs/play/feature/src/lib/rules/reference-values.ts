import { FORMULA_NUMBER_MAX, FormulaValue } from '@pioneer/rules/formula';
import type { ReferencePath, ResolveReference } from '@pioneer/rules/formula';

/** What a reference's number box holds: the last whole number typed, and whether the box shows it. */
export interface ReferenceEntry {
  readonly value: number;
  readonly complete: boolean;
}

/** Reference values the playground accepts: as large as a number written in a formula. */
export const REFERENCE_VALUE_MIN = -FORMULA_NUMBER_MAX;
export const REFERENCE_VALUE_MAX = FORMULA_NUMBER_MAX;

/** Starting values for the example formula's references, so it opens on a value: AC 20 at level 5, trained. */
const STARTING_VALUES: Readonly<Record<string, number>> = { level: 5, 'attr.dex.capped': 3, 'prof.ac': 7 };
const STARTING_VALUE = 0;

/** The entry for `path`, or its starting value while nothing has been typed for it. */
export function entryFor(entries: ReferenceEntries, path: ReferencePath): ReferenceEntry {
  return entries.get(path) ?? { value: STARTING_VALUES[path] ?? STARTING_VALUE, complete: true };
}

/** The entry's value for the formula, or undefined while the box is empty, mid-edit or out of range. */
export function usableValue(entry: ReferenceEntry): FormulaValue | undefined {
  const inRange = entry.value >= REFERENCE_VALUE_MIN && entry.value <= REFERENCE_VALUE_MAX;
  return entry.complete && inRange ? FormulaValue.parse(entry.value) : undefined;
}

/** What has been typed for each reference, by path. */
export type ReferenceEntries = ReadonlyMap<ReferencePath, ReferenceEntry>;

/** Resolves each reference to its box's value; an empty or invalid box leaves the reference unknown. */
export function resolverFor(entries: ReferenceEntries): ResolveReference {
  return (path) => usableValue(entryFor(entries, path));
}
