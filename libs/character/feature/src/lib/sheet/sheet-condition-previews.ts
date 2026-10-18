import type { ActiveCondition, Character } from '@pioneer/character/domain';
import { EffectMode } from '@pioneer/rules/engine';
import { ConditionValue } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import type { EntryPreview, EntryPreviews } from '@pioneer/rules/ui';

import { sheetEntryEffects } from './sheet-entry-effects';
import { sheetEntry, sheetEntryPreview } from './sheet-entry-previews';

/** The value the character has `id` at: the highest of its instances, as the grants keep; none for an unvalued one. */
function valueOf(active: readonly ActiveCondition[]): ConditionValue | undefined {
  const values = active.flatMap(({ value }) => (value === undefined ? [] : [value]));
  return values.length === 0 ? undefined : ConditionValue.parse(Math.max(...values));
}

/**
 * What a condition previews as on `character`: its entry, and when the character has it, its value and the lines it
 * adds to the statistics the engine derives, so frightened 2 says "−2 status" where the entry says "the condition's
 * value". A condition the character lacks, or one the registry doesn't hold, previews as the entry does elsewhere.
 */
function sheetConditionPreview(
  registry: ContentRegistry | undefined,
  character: Character | undefined,
  id: ContentId,
): EntryPreview | undefined {
  const entry = sheetEntryPreview(registry, id);
  const active = character?.document.play.conditions.filter(({ condition }) => condition === id) ?? [];
  if (registry === undefined || character === undefined || entry === undefined || active.length === 0) {
    return entry;
  }
  const value = valueOf(active);
  const condition = sheetEntry(registry, id);
  return {
    ...entry,
    ...(value === undefined ? {} : { value }),
    ...(condition === undefined
      ? {}
      : { effects: sheetEntryEffects(registry, character, { entry: condition, mode: EffectMode.Applying }) }),
  };
}

/** The previews the header's conditions open, read from what the sheet has loaded; none while that loads. */
export function sheetConditionPreviews(
  registry: () => ContentRegistry | undefined,
  character: () => Character | undefined,
): EntryPreviews {
  return { preview: (id) => sheetConditionPreview(registry(), character(), id) };
}
