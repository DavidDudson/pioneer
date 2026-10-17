import { statisticContent, summariseEffects } from '@pioneer/rules/engine';
import type { EffectLine, EffectMode, SummarisedEntry } from '@pioneer/rules/engine';

import type { CharacterDocument } from './character-document';
import { rulesInPlay } from './character-statistics';
import type { StatisticSources } from './character-statistics';
import { contentRolledAs } from './initiative-roll';

/** The entry whose effects are asked for, and whether it is in play or would be. */
export interface EffectsRequest {
  readonly entry: SummarisedEntry;
  readonly mode: EffectMode;
}

/**
 * The concrete effects of `entry` on the character (`summariseEffects`), read from the rules the sheet derives its
 * statistics from, so each line is what the sheet's breakdown shows. `applying` is what the entry does now;
 * `would-apply` is what it would do if taken, equipped, cast or gained. None without a proficiency bonus table, as
 * nothing can be derived.
 */
export function characterEffects(
  document: CharacterDocument,
  sources: StatisticSources,
  { entry, mode }: EffectsRequest,
): readonly EffectLine[] {
  const content = statisticContent(sources.registry);
  if (content === undefined) {
    return [];
  }
  const modifiers = rulesInPlay(document, sources);
  return summariseEffects(
    { content: contentRolledAs(content, sources.as), inputs: sources.inputs, modifiers },
    entry,
    mode,
  );
}
