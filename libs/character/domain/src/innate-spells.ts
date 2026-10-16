import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { SlotRank, SpellPreparation } from '@pioneer/rules/sdk';
import type { SpellRank } from '@pioneer/rules/sdk';

import type { CharacterLevel } from './character-fields';
import { cantripRank } from './prepared-spells';
import type { SpellContent, SpellOption } from './spell-content';

/** An innate spell the character casts, and the rank it is cast at: a cantrip is heightened to half the level, rounded up. */
export interface InnateSpell {
  readonly spell: SpellOption;
  readonly rank: SpellRank;
}

/** An innate entry's spells as its `InnateSpells` elements name them; one whose content isn't loaded is left out. */
export interface InnateEntrySpells {
  readonly entry: SpellcastingInPlay;
  readonly spells: readonly InnateSpell[];
}

/**
 * The character's innate spells (ADR-0067), by innate entry in slug order, each at the rank its element names, a
 * cantrip at half the level rounded up. An innate entry with no spells is kept, so a choice that grants them may be
 * seen to be open.
 */
export function characterInnate(
  entries: readonly SpellcastingInPlay[],
  content: SpellContent,
  level: CharacterLevel,
): readonly InnateEntrySpells[] {
  return entries
    .filter((entry) => entry.preparation === SpellPreparation.Innate)
    .map((entry): InnateEntrySpells => ({
      entry,
      spells: entry.innateSpells.flatMap(({ rank, spell }): InnateSpell[] => {
        const option = content.anySpell(spell);
        return option === undefined
          ? []
          : [{ spell: option, rank: rank === SlotRank.Cantrip ? cantripRank(level) : rank }];
      }),
    }));
}
