import type { LinkTarget } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import type { Chip } from '@pioneer/rules/ui';

import type { BrowseSource } from './browse-source';
import type { ContentEntryRef } from './browser-state';

/** What only a creature's row has: its role and size in the UI locale, and its Hit Points and Armor Class. */
export interface BrowseCreature {
  readonly role: string;
  readonly size: string;
  /** The size's place in the order from tiny to gargantuan, so the column sorts by size and not by name. */
  readonly sizeOrder: number;
  readonly hitPoints: number;
  readonly armorClass: number;
}

/** An entry as the list shows it: the level and kind already in the UI locale. */
export interface BrowseRow {
  readonly id: string;
  /** The entry's content id, which its name previews. */
  readonly entry: ContentId;
  readonly name: string;
  /** Where the entry opens on its own page. */
  readonly to: LinkTarget;
  /** The entry as the browser state names it, for a tier that picks it in place. */
  readonly ref: ContentEntryRef;
  readonly kind: string;
  readonly level: string;
  /** The level to sort by; `undefined` for an entry without one, which sorts first. */
  readonly levelValue: number | undefined;
  /** The creature's part of the row; `undefined` for any other kind. */
  readonly creature: BrowseCreature | undefined;
  readonly traits: readonly Chip[];
  readonly sources: readonly BrowseSource[];
  /** The entry is legacy content: under the Open Game License, from before the remaster. */
  readonly legacy: boolean;
}
