import type { Location } from '@angular/common';
import type { Params } from '@angular/router';
import type { ContentEntryRef } from '@pioneer/content/ui';
import { TableViewKey } from '@pioneer/frontier/data';
import * as z from 'zod';

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

/** The history state a link from the sheet leaves: an address of the app itself, never another site's. */
const OriginState = z.looseObject({
  [ORIGIN_STATE]: z
    .string()
    .startsWith('/')
    .refine((origin) => !origin.startsWith('//')),
});

/** The address the entry page was opened from, when it is one of the app's own paths. */
export function originOf(location: Pick<Location, 'getState'>): string | undefined {
  const state = OriginState.safeParse(location.getState());

  return state.success ? state.data[ORIGIN_STATE] : undefined;
}
