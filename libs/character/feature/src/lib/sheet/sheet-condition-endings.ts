import { heldContentIds } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type {
  ConditionDc,
  ConditionEnding,
  ConditionValue,
  ContentId,
  ContentRegistry,
  Selector,
} from '@pioneer/rules/sdk';
import type { PreviewEnding, PreviewEndingSource, PreviewEndingStatistic } from '@pioneer/rules/ui';

import { sheetEntry } from './sheet-entry-previews';
import { namedStatistics } from './sheet-statistics';

/** A condition a character holds: the ways it ends, and the value held, none for an unvalued one. */
export interface HeldCondition {
  readonly endings: readonly ConditionEnding[];
  readonly value: ConditionValue | undefined;
  /** What the character rolls for the statistics its checks name, by selector; none for a character not yet worked out. */
  readonly rolls?: ReadonlyMap<Selector, PreviewEndingStatistic>;
}

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

/** `id` as an entry the sheet can name; undefined while the registry lacks it. */
function sourceOf(registry: ContentRegistry, id: ContentId): PreviewEndingSource | undefined {
  const entry = sheetEntry(registry, id);
  return entry === undefined ? undefined : { id, name: entry.name };
}

/** The DC of the check an ending carries, if it carries one. */
function checkDc(ending: ConditionEnding, value: ConditionValue | undefined): number | undefined {
  return ending.kind === 'check' || ending.kind === 'action' ? dcAt(ending.check?.dc, value) : undefined;
}

/** The statistics the check of an ending may be rolled against; none for an ending without a check. */
function checkAgainst(ending: ConditionEnding): readonly Selector[] {
  return ending.kind === 'check' || ending.kind === 'action' ? (ending.check?.against ?? []) : [];
}

/** What the character rolls for each of `against` that the engine has a total for, in the order given. */
function rolledAt(
  stats: ReadonlyMap<Selector, PreviewEndingStatistic>,
  against: readonly Selector[],
): readonly PreviewEndingStatistic[] {
  return against.flatMap((selector) => stats.get(selector) ?? []);
}

/** The totals of the statistics the endings' checks are rolled against, by selector, for a character that has them. */
function rollsFor(
  registry: ContentRegistry,
  character: Character,
  endings: readonly ConditionEnding[],
): ReadonlyMap<Selector, PreviewEndingStatistic> {
  const selectors = endings.flatMap((ending) => checkAgainst(ending));
  const named = selectors.length === 0 ? [] : [...namedStatistics(registry, character, selectors)];
  return new Map(
    named.flatMap(([selector, { name, result }]): [Selector, PreviewEndingStatistic][] =>
      result.ok ? [[selector, { name, modifier: result.total }]] : [],
    ),
  );
}

/**
 * How a condition the character holds ends or eases, for the preview: each ending's rule text, its check's DC at the
 * value held, the action that does it, and which of the entries the content names as easing it the character has (a
 * spell it knows, a feat it took, a consumable it carries). An entry the registry lacks is left out, as nothing can be
 * said of it.
 */
export function heldConditionEndings(
  registry: ContentRegistry,
  character: Character,
  condition: HeldCondition,
): readonly PreviewEnding[] {
  const needsHeld = condition.endings.some((ending) => ending.kind === 'others' && ending.by.length > 0);
  const held = needsHeld ? new Set(heldContentIds(character.document)) : new Set<ContentId>();
  const rolls = rollsFor(registry, character, condition.endings);
  return endingsFor(registry, held, { ...condition, rolls });
}

/** The endings of a condition for a character that holds the entries `held`, and rolls the statistics of `rolls`. */
export function endingsFor(
  registry: ContentRegistry,
  held: ReadonlySet<ContentId>,
  { endings, value, rolls = new Map() }: HeldCondition,
): readonly PreviewEnding[] {
  return endings.map((ending): PreviewEnding => {
    const dc = checkDc(ending, value);
    const action =
      ending.kind === 'action' && ending.action !== undefined ? sourceOf(registry, ending.action) : undefined;
    const sources =
      ending.kind === 'others'
        ? ending.by.filter((id) => held.has(id)).flatMap((id) => sourceOf(registry, id) ?? [])
        : [];
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
