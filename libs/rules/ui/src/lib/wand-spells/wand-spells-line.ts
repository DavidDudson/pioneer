import type { ContentId, SpellRank } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Why the holder can't cast the spell a wand holds. */
export const WandBlock = {
  /** None of the holder's spell lists has the spell. */
  NotOnList: 'not-on-list',
  /** The holder casts no spell of its rank. */
  RankTooHigh: 'rank-too-high',
} as const;
export type WandBlock = ValueOf<typeof WandBlock>;

/** What an overcharge would come to, shown before it applies. */
export const WandCheckOutcome = {
  /** The flat check passed: the spell is cast and the wand breaks. */
  Broken: 'broken',
  /** The flat check failed: the wand is destroyed and the spell is not cast. */
  Failed: 'failed',
  /** The wand was overcharged already today: it is destroyed without a roll and nothing is cast. */
  Repeated: 'repeated',
} as const;
export type WandCheckOutcome = ValueOf<typeof WandCheckOutcome>;

/** The flat check of an overcharge waiting for the player to confirm it. */
export interface WandCheckLine {
  /** The d20 rolled, or undefined when the wand was overcharged already today and no roll is made. */
  readonly roll: number | undefined;
  readonly dc: number;
  readonly outcome: WandCheckOutcome;
}

/** What a wand has left of a count and the most it has. */
export interface WandCountLine {
  readonly left: number;
  readonly max: number;
}

/** A held wand as a section of the spell list: the spell it casts, its casts left, and what can be done with it now. */
export interface WandLine {
  /** Unique among the wands: the inventory item's id. */
  readonly key: string;
  readonly name: string;
  /** The spell's content, which its name previews on hover. */
  readonly id: ContentId;
  readonly spell: string;
  readonly rank: SpellRank;
  readonly broken: boolean;
  /** Why the holder can't cast the spell, or undefined when they can. */
  readonly blocked: WandBlock | undefined;
  /** The day's cast. */
  readonly use: WandCountLine;
  /** Whether the day's cast can be made now. */
  readonly castable: boolean;
  /** Whether the wand can be overcharged now: only after the day's cast is spent. */
  readonly overchargeable: boolean;
  /** The flat check rolled and not yet confirmed. */
  readonly check: WandCheckLine | undefined;
}
