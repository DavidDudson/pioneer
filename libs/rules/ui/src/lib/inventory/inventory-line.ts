import type { Bulk, ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { RuneBadgeData } from './rune-badge/rune-badge-data';
import type { LineRunes } from './rune-name';

/** Where an item is on the character, as the inventory groups it (character-model.md, "Inventory"). */
export const InventoryPlacement = { Worn: 'worn', Held: 'held', Stowed: 'stowed', Dropped: 'dropped' } as const;
export type InventoryPlacement = ValueOf<typeof InventoryPlacement>;

/** One item as the inventory lists it, with what it holds when it is a container. */
export interface InventoryLine {
  /** Stable across edits: the inventory item's id. */
  readonly id: string;
  /** The content it is an instance of, which its name previews on hover. */
  readonly content: ContentId;
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
  /** Whether it is worn or held in a battle form and so melded into it (#532): the form decides what it does. */
  readonly melded?: boolean | undefined;
  /**
   * The runes its name reads ("+1 Striking Flaming"); undefined for an item with none, or a specific item, whose
   * name has them.
   */
  readonly runes: LineRunes | undefined;
  /** The item's runes as badges under its name, and a hole for each rune slot it has room for; empty for anything but a weapon, armour or a shield. */
  readonly runeBadges?: readonly RuneBadgeData[] | undefined;
  /** Why the item breaks the table's rules, one reason per rule it breaks; empty for an item that breaks none. */
  readonly breaks: readonly MessageDescriptor[];
  /** Why the item breaks the rules the campaign's GM approved; empty when none is approved. */
  readonly approved: readonly MessageDescriptor[];
  /** Whether the GM gave it as a campaign key item: it breaks no rule, and the player cannot remove or sell it. */
  readonly keyItem: boolean;
  /** Router commands to the campaign's Party Inventory, which a key item names itself with; undefined when none. */
  readonly keyItemLink?: readonly string[] | undefined;
  /** What it holds, when it is a container: listed beneath it. */
  readonly contents: readonly InventoryLine[];
}

/** The items carried one way: worn, held, stowed loose or dropped. */
export interface InventoryGroup {
  readonly placement: InventoryPlacement;
  readonly lines: readonly InventoryLine[];
}
