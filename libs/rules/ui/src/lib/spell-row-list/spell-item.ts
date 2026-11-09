import type { StaffCastRequest, StaffSpellLine } from '../staff-spells/staff-spells-line';
import type { WandLine } from '../wand-spells/wand-spells-line';

/** A scroll held, as the spell it casts shows it: whether it can be cast now. */
export interface ScrollLine {
  /** Unique among the scrolls: the inventory item's id. */
  readonly key: string;
  /** Whether the turn can pay for the cast. */
  readonly castable: boolean;
}

/** The item a spell row is cast from, and what can be done with the item: a wand, a staff's spell or a scroll. */
export type SpellItemLine =
  | { readonly kind: 'wand'; readonly wand: WandLine }
  | {
      readonly kind: 'staff';
      readonly staff: string;
      /** Whether it is the staff prepared for the day, whose charges can be spent. */
      readonly prepared: boolean;
      readonly spell: StaffSpellLine;
    }
  | { readonly kind: 'scroll'; readonly scroll: ScrollLine };

/** What the player does with a wand. */
export type WandAction = 'cast' | 'overcharge' | 'confirm' | 'decline' | 'repair';

/** What the player chose to do with an item of a spell row. */
export type SpellItemEvent =
  | { readonly kind: 'wand'; readonly action: WandAction; readonly key: string }
  | { readonly kind: 'staff'; readonly request: StaffCastRequest }
  | { readonly kind: 'scroll'; readonly key: string };
