import type { SpellSlots } from '@pioneer/rules/engine';
import { MagicTradition, SlotCount, SpellPreparation, SpellRank, StatisticKind } from '@pioneer/rules/sdk';

import type { SpellcastingEntryLine } from '../spellcasting/spellcasting-entry-line';
import { statistic, term } from './breakdown-fixtures';

const INT = 4;
const CHA = 3;
const TRAINED_AT_1 = 3;
const DC_BASE = 10;

/** Cantrips and slots per rank, from the counts of each rank in turn from 1st. */
function slotsOf(cantrips: number, counts: readonly number[]): SpellSlots {
  return {
    cantrips: SlotCount.parse(cantrips),
    ranks: counts.map((count, index) => ({ rank: SpellRank.parse(index + 1), count: SlotCount.parse(count) })),
  };
}

const CLASS_CANTRIPS = 5;
const DEDICATION_CANTRIPS = 2;
/** A 1st-level class caster's two 1st-rank slots. */
const FIRST_LEVEL_SLOTS = [2];

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
  slots: slotsOf(CLASS_CANTRIPS, FIRST_LEVEL_SLOTS),
  pools: [{ key: 'curriculum', source: 'School of Battle Magic', slots: slotsOf(1, [1]) }],
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
  slots: slotsOf(DEDICATION_CANTRIPS, []),
  pools: [],
};

export const WIZARD_SPELLCASTING: readonly SpellcastingEntryLine[] = [WIZARD];
export const MULTICLASS_SPELLCASTING: readonly SpellcastingEntryLine[] = [BARD, WIZARD];

const WIS = 4;
const EXPERT_AT_7 = 11;
const FULL_RANK = 3;
const NEW_RANK = 2;
/** A 7th-level cleric's own slots: three of 1st to 3rd rank, two of 4th. */
const SEVENTH_LEVEL_SLOTS = [FULL_RANK, FULL_RANK, FULL_RANK, NEW_RANK];
const FONT_AT_5 = 5;

/** A 7th-level cleric's own cantrips and slots. */
export const CLERIC_SLOTS: SpellSlots = slotsOf(CLASS_CANTRIPS, SEVENTH_LEVEL_SLOTS);
/** Its divine font: five slots at its highest rank, 4th. */
export const DIVINE_FONT_SLOTS: SpellSlots = {
  ranks: [{ rank: SpellRank.parse(SEVENTH_LEVEL_SLOTS.length), count: SlotCount.parse(FONT_AT_5) }],
};

/** A 7th-level cleric: Wisdom +4, expert in spellcasting, with a divine font of five 4th-rank slots. */
const CLERIC: SpellcastingEntryLine = {
  key: 'cleric',
  tradition: MagicTradition.Divine,
  preparation: SpellPreparation.Prepared,
  source: 'Cleric Spellcasting',
  statistics: [
    {
      name: 'Spell attack',
      kind: StatisticKind.Check,
      result: statistic('spell-attack:cleric', {
        base: [term('@spellcasting.attr', WIS), term('@spellcasting.prof', EXPERT_AT_7)],
      }),
    },
    {
      name: 'Spell DC',
      kind: StatisticKind.Dc,
      result: statistic('spell-dc:cleric', {
        base: [term('10', DC_BASE), term('@stat.spell-attack', WIS + EXPERT_AT_7)],
      }),
    },
  ],
  slots: CLERIC_SLOTS,
  pools: [{ key: 'divine-font', source: 'Divine Font', slots: DIVINE_FONT_SLOTS }],
};

export const CLERIC_SPELLCASTING: readonly SpellcastingEntryLine[] = [CLERIC];
