import type { UsableLine } from '../actions/action-user';
import type { SpellDetailLine } from '../spell-list/spell-detail-line';
import type { SpellItemLine } from './spell-item';

/** One spell of the list: what it is and does, and what casting it spends when the page lets it be cast. */
export interface SpellRowLine {
  /** Unique in the list: the spell's id with the source it comes from. */
  readonly key: string;
  readonly detail: SpellDetailLine;
  readonly use?: UsableLine | undefined;
  /** The wand, staff or scroll it is cast from, with what can be done with it; absent for a spell the character knows. */
  readonly item?: SpellItemLine | undefined;
}
