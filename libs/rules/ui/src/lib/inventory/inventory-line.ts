import type { Bulk } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Where an item is on the character, as the inventory groups it (character-model.md, "Inventory"). */
export const InventoryPlacement = { Worn: 'worn', Held: 'held', Stowed: 'stowed', Dropped: 'dropped' } as const;
export type InventoryPlacement = ValueOf<typeof InventoryPlacement>;

/** One item as the inventory lists it, with what it holds when it is a container. */
export interface InventoryLine {
  /** Stable across edits: the inventory item's id. */
  readonly id: string;
  /** The player's name for it, else the content's; undefined when no loaded pack has its content. */
  readonly name: string | undefined;
  /** The content's name, shown beside a name the player gave. */
  readonly contentName: string | undefined;
  readonly quantity: number;
  /** The Bulk of `bulkPer` items (10 arrows are light), or of one when `bulkPer` is undefined; undefined when its
   * content isn't loaded. */
  readonly bulk: Bulk | undefined;
  readonly bulkPer: number | undefined;
  /** The hands a held item is held in; undefined for one that isn't held. */
  readonly hands: number | undefined;
  readonly invested: boolean;
  /** What it holds, when it is a container: listed beneath it. */
  readonly contents: readonly InventoryLine[];
}

/** The items carried one way: worn, held, stowed loose or dropped. */
export interface InventoryGroup {
  readonly placement: InventoryPlacement;
  readonly lines: readonly InventoryLine[];
}
