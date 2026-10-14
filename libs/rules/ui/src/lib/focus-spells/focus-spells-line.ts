import type { ContentId, FocusPoints, MagicTradition, SpellRank } from '@pioneer/rules/sdk';

import type { SpellDetailLine } from '../spell-list/spell-detail-line';

/** A focus spell by name; a focus cantrip costs no Focus Point. */
export interface FocusSpellLine {
  /** Unique among its entry's spells: the spell's id. */
  readonly key: string;
  /** The spell's content, which its name previews on hover. */
  readonly id: ContentId;
  readonly name: string;
  readonly cantrip: boolean;
  /** What casting it takes and does at the focus rank; undefined while it is not worded. */
  readonly detail: SpellDetailLine | undefined;
}

/** A focus entry's spells, named by its tradition. */
export interface FocusEntryLine {
  /** Unique among the entries: the entry's slug. */
  readonly key: string;
  readonly tradition: MagicTradition;
  readonly spells: readonly FocusSpellLine[];
}

/** A character's focus spells (ADR-0050): the rank they are cast at, the focus pool, and each focus entry's spells. */
export interface FocusLine {
  readonly rank: SpellRank;
  readonly pool: FocusPoints;
  readonly entries: readonly FocusEntryLine[];
}
