import type { ConditionDc, ConditionEnding, ConditionValue, ContentId, Selector } from '@pioneer/rules/sdk';

import type { PreviewEnding, PreviewEndingSource, PreviewEndingStatistic } from './entry-preview';

/** A condition a character holds: the ways it ends, and the value held, none for an unvalued one. */
export interface HeldCondition {
  readonly endings: readonly ConditionEnding[];
  readonly value: ConditionValue | undefined;
  /** What the character rolls for the statistics its checks name, by selector; none for a character not yet worked out. */
  readonly rolls?: ReadonlyMap<Selector, PreviewEndingStatistic>;
}

/** Names an entry the content points at; undefined while the page has not loaded it. */
export type EndingSourceOf = (id: ContentId) => PreviewEndingSource | undefined;

/** A DC's whole number and, when it follows the condition's value, the `+ @value` that adds it. */
const DC_PARTS = /^(?<base>\d{1,2})(?<byValue> \+ @value)?$/u;

/** The DC of `dc` at the value the character holds; a DC that follows the value of an unvalued condition is its base. */
function dcAt(dc: ConditionDc | undefined, value: ConditionValue | undefined): number | undefined {
  const parts = dc === undefined ? undefined : DC_PARTS.exec(dc)?.groups;
  if (parts?.['base'] === undefined) {
    return undefined;
  }
  const base = Number(parts['base']);
  return parts['byValue'] === undefined ? base : base + (value ?? 0);
}

/** The DC of the check an ending carries, if it carries one. */
function checkDc(ending: ConditionEnding, value: ConditionValue | undefined): number | undefined {
  return ending.kind === 'check' || ending.kind === 'action' ? dcAt(ending.check?.dc, value) : undefined;
}

/** The statistics the check of an ending may be rolled against; none for an ending without a check. */
export function checkAgainst(ending: ConditionEnding): readonly Selector[] {
  return ending.kind === 'check' || ending.kind === 'action' ? (ending.check?.against ?? []) : [];
}

/** What the character rolls for each of `against` that the engine has a total for, in the order given. */
function rolledAt(
  stats: ReadonlyMap<Selector, PreviewEndingStatistic>,
  against: readonly Selector[],
): readonly PreviewEndingStatistic[] {
  return against.flatMap((selector) => stats.get(selector) ?? []);
}

/**
 * The endings of a condition as a reader meets them: each ending's rule text, its check's DC at the value held, what
 * the reader rolls for the check, the action that does it, and which of the entries the content names as easing it the
 * reader `held`. An entry `sourceOf` can't name is left out, as nothing can be said of it.
 */
export function conditionEndings(
  sourceOf: EndingSourceOf,
  held: ReadonlySet<ContentId>,
  { endings, value, rolls = new Map() }: HeldCondition,
): readonly PreviewEnding[] {
  return endings.map((ending): PreviewEnding => {
    const dc = checkDc(ending, value);
    const action = ending.kind === 'action' && ending.action !== undefined ? sourceOf(ending.action) : undefined;
    const sources =
      ending.kind === 'others' ? ending.by.filter((id) => held.has(id)).flatMap((id) => sourceOf(id) ?? []) : [];
    return {
      kind: ending.kind,
      text: ending.text,
      ...(dc === undefined ? {} : { dc }),
      against: rolledAt(rolls, checkAgainst(ending)),
      ...(action === undefined ? {} : { action }),
      held: sources,
    };
  });
}
