import type { GrantResolution } from '@pioneer/rules/grants';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, Frequency } from '@pioneer/rules/sdk';

import { slotMaxima, useMaxima } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { characterSpellcasting } from './spellcasting-build';

/** Frequencies already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, Frequency>>();

/** The frequency of the action a feat, class feature or action is, if it has one. */
function frequencyOf(entry: ContentEntry): Frequency | undefined {
  if (entry.kind === ContentKind.Action) {
    return entry.data.frequency;
  }
  if (entry.kind === ContentKind.Feat || entry.kind === ContentKind.ClassFeature) {
    return entry.data.action?.frequency;
  }
  return undefined;
}

/** The frequency of each feat, class feature and action in the registry that has one; read once per registry. */
export function abilityFrequencies(registry: ContentRegistry): ReadonlyMap<ContentId, Frequency> {
  const existing = READ.get(registry);
  if (existing !== undefined) {
    return existing;
  }
  const read = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .flatMap((entry): [ContentId, Frequency][] => {
        const frequency = frequencyOf(entry);
        return frequency === undefined ? [] : [[entry.id, frequency]];
      }),
  );
  READ.set(registry, read);
  return read;
}

/**
 * What the character can spend and how much: a maximum for each rank of each spellcasting entry and pool, and for each
 * feat or action it has with a frequency, each with the boundary it comes back on.
 */
export function characterCounted(
  resolution: GrantResolution,
  frequencies: ReadonlyMap<ContentId, Frequency>,
): CountedMaxima {
  return {
    slots: slotMaxima(characterSpellcasting(resolution)),
    uses: useMaxima(
      resolution.items.map(({ entry }) => entry.id),
      (id) => frequencies.get(id),
    ),
  };
}
