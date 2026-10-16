import { SlotRank, SpellPreparation } from '@pioneer/rules/sdk';

import { PathbuilderName } from './import-kind';
import type { PathbuilderBuild } from './pathbuilder-export';

/** How a caster casts, as far as the character can hold: prepared or spontaneous slots; anything else (innate) is neither. */
type CasterPreparation = typeof SpellPreparation.Prepared | typeof SpellPreparation.Spontaneous | undefined;

/** The spells a caster has at one rank; Pathbuilder's rank 0 is the cantrips. */
export interface ImportedSpellRank {
  readonly rank: number | typeof SlotRank.Cantrip;
  readonly spells: readonly PathbuilderName[];
}

/** One `spellCasters` row: a class's casting, or an archetype's, a feat's or a heritage's. */
export interface ImportedCaster {
  /** "Oracle", "Archetype Sorcerer", "Grown of Oak": the class, or the feat or heritage that gives the casting. */
  readonly name: PathbuilderName;
  /** The tradition as Pathbuilder wrote it ("divine"). */
  readonly tradition: PathbuilderName;
  /** Undefined for innate casting, which has no slots to fill. */
  readonly preparation: CasterPreparation;
  readonly innate: boolean;
  /** The ranks that list a spell, lowest first. */
  readonly ranks: readonly ImportedSpellRank[];
  /** Pathbuilder's spell slots per rank, cantrips first; compared with the engine's, never imported. */
  readonly perDay: readonly number[];
}

const PREPARATION_BY_WORD: Readonly<Record<string, CasterPreparation>> = {
  prepared: SpellPreparation.Prepared,
  spontaneous: SpellPreparation.Spontaneous,
};

function named(raw: string): PathbuilderName | undefined {
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : PathbuilderName.parse(trimmed);
}

/** The export's casters in order; a caster with no name or tradition is left out. */
export function importedCasters(build: PathbuilderBuild): ImportedCaster[] {
  return build.spellCasters.flatMap((caster): ImportedCaster[] => {
    const name = named(caster.name);
    const tradition = named(caster.magicTradition);
    if (name === undefined || tradition === undefined) {
      return [];
    }
    const ranks = caster.spells
      .toSorted((left, right) => left.spellLevel - right.spellLevel)
      .flatMap(({ spellLevel, list }): ImportedSpellRank[] => {
        const spells = list.flatMap((spell) => named(spell) ?? []);
        return spells.length === 0 ? [] : [{ rank: spellLevel === 0 ? SlotRank.Cantrip : spellLevel, spells }];
      });
    return [
      {
        name,
        tradition,
        preparation: caster.innate ? undefined : PREPARATION_BY_WORD[caster.spellcastingType.trim().toLowerCase()],
        innate: caster.innate,
        ranks,
        perDay: caster.perDay,
      },
    ];
  });
}
