import type { SpellSlots } from '@pioneer/rules/engine';
import type { MagicTradition, SpellPreparation } from '@pioneer/rules/sdk';

import type { NamedStatistic } from '../statistics/statistics.component';

/** Slots kept apart from an entry's own, named by what gave them: a divine font, a school's curriculum. */
export interface SlotPoolLine {
  /** Unique among the entry's pools: the pool's slug. */
  readonly key: string;
  /** The name of the entry that gave it: "Divine Font", "School of Battle Magic". */
  readonly source: string;
  readonly slots: SpellSlots;
}

/** A spellcasting entry as the sheet lists it: its tradition, how it casts, where it came from, and its statistics. */
export interface SpellcastingEntryLine {
  /** Unique among the lines: the entry's slug. */
  readonly key: string;
  readonly tradition: MagicTradition;
  readonly preparation: SpellPreparation;
  /** The name of the entry that gave it: "Wizard Spellcasting", a patron, a dedication. */
  readonly source: string;
  /** Its spell attack, then its spell DC. */
  readonly statistics: readonly NamedStatistic[];
  /** Its cantrips and slots per rank at the character's level. */
  readonly slots: SpellSlots;
  /** Its other pools of slots. */
  readonly pools: readonly SlotPoolLine[];
}
