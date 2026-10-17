import type { LinkTarget } from '@pioneer/frontier';
import type { SourceRef } from '@pioneer/rules/sdk';
import type { Chip } from '@pioneer/rules/ui';

import type { ContentEntryRef } from './browser-state';

/** An entry as the list shows it: the level and kind already in the UI locale. */
export interface BrowseRow {
  readonly id: string;
  readonly name: string;
  /** Where the entry opens on its own page. */
  readonly to: LinkTarget;
  /** The entry as the browser state names it, for a tier that picks it in place. */
  readonly ref: ContentEntryRef;
  readonly kind: string;
  readonly level: string;
  readonly traits: readonly Chip[];
  readonly sources: readonly SourceRef[];
}
