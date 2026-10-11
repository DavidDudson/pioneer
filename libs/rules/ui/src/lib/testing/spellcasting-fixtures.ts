import { MagicTradition, SpellPreparation, StatisticKind } from '@pioneer/rules/sdk';

import type { SpellcastingEntryLine } from '../spellcasting/spellcasting-entry-line';
import { statistic, term } from './breakdown-fixtures';

const INT = 4;
const CHA = 3;
const TRAINED_AT_1 = 3;
const DC_BASE = 10;

/** A 1st-level wizard's entry: Intelligence +4, trained in arcane spellcasting. */
const WIZARD: SpellcastingEntryLine = {
  key: 'wizard',
  tradition: MagicTradition.Arcane,
  preparation: SpellPreparation.Prepared,
  source: 'Wizard Spellcasting',
  statistics: [
    {
      name: 'Spell attack',
      kind: StatisticKind.Check,
      result: statistic('spell-attack:wizard', {
        base: [term('@spellcasting.attr', INT), term('@spellcasting.prof', TRAINED_AT_1)],
      }),
    },
    {
      name: 'Spell DC',
      kind: StatisticKind.Dc,
      result: statistic('spell-dc:wizard', {
        base: [term('10', DC_BASE), term('@stat.spell-attack', INT + TRAINED_AT_1)],
      }),
    },
  ],
};

/** The same wizard with a bard dedication: Charisma +3, trained in occult spellcasting, casting from a repertoire. */
const BARD: SpellcastingEntryLine = {
  key: 'bard',
  tradition: MagicTradition.Occult,
  preparation: SpellPreparation.Spontaneous,
  source: 'Bard Dedication',
  statistics: [
    {
      name: 'Spell attack',
      kind: StatisticKind.Check,
      result: statistic('spell-attack:bard', {
        base: [term('@spellcasting.attr', CHA), term('@spellcasting.prof', TRAINED_AT_1)],
      }),
    },
    {
      name: 'Spell DC',
      kind: StatisticKind.Dc,
      result: statistic('spell-dc:bard', {
        base: [term('10', DC_BASE), term('@stat.spell-attack', CHA + TRAINED_AT_1)],
      }),
    },
  ],
};

export const WIZARD_SPELLCASTING: readonly SpellcastingEntryLine[] = [WIZARD];
export const MULTICLASS_SPELLCASTING: readonly SpellcastingEntryLine[] = [BARD, WIZARD];
