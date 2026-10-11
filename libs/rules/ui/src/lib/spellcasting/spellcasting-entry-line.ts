import type { MagicTradition, SpellPreparation } from '@pioneer/rules/sdk';

import type { NamedStatistic } from '../statistics/statistics.component';

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
}
