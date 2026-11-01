import type { ActiveCondition, Character } from '@pioneer/character/domain';
import { EffectMode } from '@pioneer/rules/engine';
import { ConditionValue, ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import type { EntryPreview, EntryPreviews } from '@pioneer/rules/ui';

import { injectStatisticLink } from './sheet-breakdown/sheet-breakdown';
import { sheetEntryEffects } from './sheet-entry-effects';
import { sheetEntry, sheetEntryPreview } from './sheet-entry-previews';

/** The value the character has `id` at: the highest of its instances, as the grants keep; none for an unvalued one. */
function valueOf(active: readonly ActiveCondition[]): ConditionValue | undefined {
  const values = active.flatMap(({ value }) => (value === undefined ? [] : [value]));
  return values.length === 0 ? undefined : ConditionValue.parse(Math.max(...values));
}

/**
 * What a condition the character has previews as: its entry with the character's value and the lines it adds to the
 * statistics the engine derives, so frightened 2 says "−2 status" where the entry says "the condition's value". None
 * for a condition the character lacks, an entry that isn't a condition, or a registry that doesn't hold it.
 */
export function heldConditionPreview(
  registry: ContentRegistry | undefined,
  character: Character | undefined,
  id: ContentId,
): EntryPreview | undefined {
  const active = character?.document.play.conditions.filter(({ condition }) => condition === id) ?? [];
  if (registry === undefined || character === undefined || active.length === 0) {
    return undefined;
  }
  const condition = sheetEntry(registry, id);
  const preview = sheetEntryPreview(registry, id);
  if (condition?.kind !== ContentKind.Condition || preview === undefined) {
    return undefined;
  }
  const value = valueOf(active);
  return {
    ...preview,
    ...(value === undefined ? {} : { value }),
    effects: sheetEntryEffects(registry, character, {
      entry: condition,
      mode: EffectMode.Applying,
    }),
  };
}

/** What a condition previews as on `character`: as it applies when held, else as its entry does elsewhere. */
function sheetConditionPreview(
  registry: ContentRegistry | undefined,
  character: Character | undefined,
  id: ContentId,
): EntryPreview | undefined {
  return heldConditionPreview(registry, character, id) ?? sheetEntryPreview(registry, id);
}

/**
 * `own` with a condition the character has previewing as it applies (value and effects), wherever the section's own
 * registry holds the condition or not. Any other reference keeps `own`'s preview, and a condition the character lacks
 * keeps its entry's. The engine's registry carries the condition kind whenever the character has a condition, so
 * nothing is fetched for a reference to one it doesn't.
 */
export function withHeldConditions(
  own: EntryPreviews,
  engine: {
    readonly registry: () => ContentRegistry | undefined;
    readonly character: () => Character | undefined;
  },
): EntryPreviews {
  return {
    ...own,
    preview: (id) => heldConditionPreview(engine.registry(), engine.character(), id) ?? own.preview(id),
  };
}

/** The previews the header's conditions open, read from what the sheet has loaded; none while that loads. */
export function sheetConditionPreviews(
  registry: () => ContentRegistry | undefined,
  character: () => Character | undefined,
): EntryPreviews {
  return {
    preview: (id) => sheetConditionPreview(registry(), character(), id),
    statistic: injectStatisticLink(),
  };
}
