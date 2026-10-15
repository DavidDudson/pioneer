import type { ContentId, StaffRank } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Why the holder can't cast a spell the staff holds. */
export const StaffSpellBlock = {
  /** None of the holder's spell lists has the spell. */
  NotOnList: 'not-on-list',
  /** The holder casts no spell of its rank. */
  RankTooHigh: 'rank-too-high',
} as const;
export type StaffSpellBlock = ValueOf<typeof StaffSpellBlock>;

/** A spell a staff holds by name, under the rank the staff lists it, with what casting it costs. */
export interface StaffSpellLine {
  /** Unique among the staff's spells: the spell's id. */
  readonly key: string;
  /** The spell's content, which its name previews on hover. */
  readonly id: ContentId;
  readonly name: string;
  readonly rank: StaffRank;
  /** The charges casting it spends; none for a cantrip. */
  readonly charges: number;
  /** Why the holder can't cast it, or undefined when they can. */
  readonly blocked: StaffSpellBlock | undefined;
}

/** The charges of the staff prepared for the day. */
export interface StaffChargesLine {
  readonly left: number;
  readonly max: number;
}

/** A held staff as a section of the spell list: its name, the charges it has left and its spells by rank. */
export interface StaffLine {
  /** Unique among the staves: the inventory item's id. */
  readonly key: string;
  readonly name: string;
  /** The charges left, or undefined when it is not the staff prepared for the day. */
  readonly charges: StaffChargesLine | undefined;
  readonly spells: readonly StaffSpellLine[];
}
