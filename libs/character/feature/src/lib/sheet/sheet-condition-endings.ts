import { heldContentIds } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { ConditionEnding, ContentId, ContentRegistry, Selector } from '@pioneer/rules/sdk';
import { checkAgainst, conditionEndings } from '@pioneer/rules/ui';
import type { HeldCondition, PreviewEnding, PreviewEndingSource, PreviewEndingStatistic } from '@pioneer/rules/ui';

import { sheetEntry } from './sheet-entry-previews';
import { namedStatistics } from './sheet-statistics';

export type { HeldCondition } from '@pioneer/rules/ui';

/** `id` as an entry the sheet can name; undefined while the registry lacks it. */
function sourceOf(registry: ContentRegistry, id: ContentId): PreviewEndingSource | undefined {
  const entry = sheetEntry(registry, id);
  return entry === undefined ? undefined : { id, name: entry.name };
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
  condition: HeldCondition,
): readonly PreviewEnding[] {
  return conditionEndings((id) => sourceOf(registry, id), held, condition);
}
