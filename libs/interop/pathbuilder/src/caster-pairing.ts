import type { SpellPreparation } from '@pioneer/rules/sdk';
import { foldName } from '@pioneer/shared/utils';

import type { ImportedCaster } from './read-spells';

/** Where a spellcasting entry of the character is: its slug, how it casts and its tradition. */
export interface CasterHome {
  readonly slug: string;
  readonly preparation: SpellPreparation;
  readonly tradition: string;
}

function sameCasting(caster: ImportedCaster, entry: CasterHome): boolean {
  return caster.preparation === entry.preparation && foldName(caster.tradition) === foldName(entry.tradition);
}

/** Whether the caster's name is the entry's (the Oracle's `oracle`), either way round. */
function sameName(caster: ImportedCaster, entry: CasterHome): boolean {
  const casterKey = foldName(caster.name);
  const entryKey = foldName(entry.slug);

  return casterKey.includes(entryKey) || entryKey.includes(casterKey);
}

/**
 * Each caster's entry: of those that cast the same way (prepared or spontaneous, the same tradition) the one that
 * shares its name, else the first no earlier caster took. A caster with no such entry (innate casting, a class or
 * archetype the character lacks) is left out.
 */
export function pairCasters<Entry extends CasterHome>(
  casters: ReadonlyArray<ImportedCaster>,
  entries: ReadonlyArray<Entry>,
): Map<ImportedCaster, Entry> {
  const paired = new Map<ImportedCaster, Entry>();
  const taken = new Set<Entry>();

  for (const caster of casters) {
    const free = entries.filter((entry) => !taken.has(entry) && sameCasting(caster, entry));
    const entry = free.find((each) => sameName(caster, each)) ?? free[0];

    if (entry !== undefined) {
      paired.set(caster, entry);
      taken.add(entry);
    }
  }

  return paired;
}
