import type { FocusPoints, MagicTradition, SpellRank } from '@pioneer/rules/sdk';

/** A focus spell by name; a focus cantrip costs no Focus Point. */
export interface FocusSpellLine {
  /** Unique among its entry's spells: the spell's id. */
  readonly key: string;
  readonly name: string;
  readonly cantrip: boolean;
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
