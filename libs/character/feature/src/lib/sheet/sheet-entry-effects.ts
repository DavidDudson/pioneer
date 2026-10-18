import { characterEffects } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { EffectLine, EffectMode } from '@pioneer/rules/engine';
import { ContentId, ContentKind, ContentLevel, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentRegistry } from '@pioneer/rules/sdk';
import type { PreviewEffect } from '@pioneer/rules/ui';

import { traitNames } from './sheet-build';
import { sheetSources } from './sheet-sources';

/** The name of the statistic a line changes; none for a line that changes none (a defence, a sense). */
function statisticName(registry: ContentRegistry, line: EffectLine): string | undefined {
  if (line.change !== 'bonus' && line.change !== 'penalty' && line.change !== 'set') {
    return undefined;
  }
  return registry.statisticsFor(line.selector).at(-1)?.definition.name ?? line.selector;
}

/** Sense names already read, by registry: a registry's packs never change once loaded. */
const SENSE_NAMES = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, string>>();

/** Each sense's name, by its entry in the sense vocabulary. */
function senseNames(registry: ContentRegistry): ReadonlyMap<ContentId, string> {
  const read =
    SENSE_NAMES.get(registry) ??
    new Map(
      registry.packs
        .flatMap((pack) => pack.otherEntries)
        .filter((entry) => entry.kind === ContentKind.Sense)
        .map((entry) => [ContentId.parse(entry.id), entry.name] as const),
    );
  SENSE_NAMES.set(registry, read);
  return read;
}

/** The names a line words with: its sense's, and its weakness or resistance's exception traits. */
function namesOf(registry: ContentRegistry, line: EffectLine): Pick<PreviewEffect, 'sense' | 'exceptions'> {
  if (line.change === 'sense') {
    const name = senseNames(registry).get(line.sense);
    return name === undefined ? {} : { sense: name };
  }
  if ((line.change === 'weakness' || line.change === 'resistance') && line.exceptions.length > 0) {
    const traits = traitNames(registry);
    return { exceptions: line.exceptions.map((exception) => traits.get(Trait.parse(exception)) ?? exception) };
  }
  return {};
}

/** `line` with its statistic's name, and the names it is worded with. */
function previewEffect(registry: ContentRegistry, line: EffectLine): PreviewEffect {
  return { statistic: statisticName(registry, line), line, ...namesOf(registry, line) };
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
  return lines.map((line) => previewEffect(registry, line));
}
