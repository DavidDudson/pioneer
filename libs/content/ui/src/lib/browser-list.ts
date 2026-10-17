import type { FacetCounts } from '@pioneer/rules/sdk';
import type { EntryPreview } from '@pioneer/rules/ui';

import type { BrowseRow } from './browse-row';

/** The list a tier shows: the rows to draw, how many entries the filters leave, and what each filter value would leave. */
export interface ContentBrowserList {
  /** The rows shown so far; `total` can be more. */
  readonly rows: readonly BrowseRow[];
  readonly total: number;
  readonly counts: readonly FacetCounts[];
  /** Whether the list is what a search found, which changes what an empty list says. */
  readonly searching: boolean;
}

/** The picked entry once its bundle has loaded; `card` is `undefined` when no entry has the link. */
export interface ContentBrowserEntry {
  readonly card: EntryPreview | undefined;
}
