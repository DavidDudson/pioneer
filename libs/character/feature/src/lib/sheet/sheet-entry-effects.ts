import { characterEffects } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { EffectLine, EffectMode } from '@pioneer/rules/engine';
import { ContentLevel } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentRegistry } from '@pioneer/rules/sdk';
import type { PreviewEffect } from '@pioneer/rules/ui';

import { sheetSources } from './sheet-sources';

/** The name of the statistic a line changes; none for a line that changes none (a defence, a sense). */
function statisticName(registry: ContentRegistry, line: EffectLine): string | undefined {
  if (line.change !== 'bonus' && line.change !== 'penalty' && line.change !== 'set') {
    return undefined;
  }
  return registry.statisticsFor(line.selector).at(-1)?.definition.name ?? line.selector;
}

/** The entry whose effects are asked for, and whether it is in play or would be. */
export interface EntryEffectsRequest {
  readonly entry: ContentEntry;
  readonly mode: EffectMode;
}

/**
 * What `entry` does to `character`, or would if taken, equipped, cast or gained, as the engine summarises it from the
 * rules the sheet derives its statistics from, so each line is what the breakdown shows. `registry` is the one the
 * sheet derives from; `entry` may come from elsewhere (a fetched bundle).
 */
export function sheetEntryEffects(
  registry: ContentRegistry,
  character: Character,
  { entry, mode }: EntryEffectsRequest,
): readonly PreviewEffect[] {
  const level = 'level' in entry ? ContentLevel.safeParse(entry.level).data : undefined;
  const lines = characterEffects(character.document, sheetSources(registry, character), {
    entry: { id: entry.id, rules: entry.rules, sources: [...entry.sources], level },
    mode,
  });
  return lines.map((line) => ({ statistic: statisticName(registry, line), line }));
}
