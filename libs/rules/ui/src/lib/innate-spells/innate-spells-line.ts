import type { MagicTradition, SpellRank } from '@pioneer/rules/sdk';

import type { FocusSpellLine } from '../focus-spells/focus-spells-line';

/** An innate spell by name, and the rank it is cast at. */
export interface InnateSpellLine extends FocusSpellLine {
  readonly rank: SpellRank;
}

/** An innate entry's spells, named by its tradition. */
export interface InnateEntryLine {
  /** Unique among the entries: the entry's slug. */
  readonly key: string;
  readonly tradition: MagicTradition;
  readonly spells: readonly InnateSpellLine[];
}

/** A character's innate spells (ADR-0067), by innate entry. */
export interface InnateLine {
  readonly entries: readonly InnateEntryLine[];
}
