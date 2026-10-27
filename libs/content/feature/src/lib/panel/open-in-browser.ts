import type { Params } from '@angular/router';
import type { ContentEntryRef } from '@pioneer/content/ui';
import { TableViewKey } from '@pioneer/frontier/data';

import { isBrowseKind, KIND_PARAM, kindsToQuery } from '../browser/browse-kinds';

/** The router state a link from the sheet carries, so the entry page can offer the way back. */
export const ORIGIN_STATE = 'origin';

/** Where the full content page shows `entry`, as `routerLink` takes it. */
export interface BrowserLink {
  readonly commands: readonly string[];
  readonly queryParams: Params;
}

/**
 * The entry's page (`/content/:kind/:name`) with the browser's view of the same kind and words, so going back to the
 * list from there lands where the panel was.
 */
export function browserLink(entry: ContentEntryRef, words: string): BrowserLink {
  const trimmed = words.trim();
  return {
    commands: ['/content', entry.kind, entry.name],
    queryParams: {
      [KIND_PARAM]: isBrowseKind(entry.kind) ? kindsToQuery([entry.kind]) : undefined,
      [TableViewKey.Search]: trimmed === '' ? undefined : trimmed,
    },
  };
}

/** The address the entry page was opened from, when it is one of the app's own paths. */
export function originOf(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !(ORIGIN_STATE in state)) {
    return undefined;
  }
  const origin: unknown = state[ORIGIN_STATE];
  return typeof origin === 'string' && origin.startsWith('/') && !origin.startsWith('//') ? origin : undefined;
}
