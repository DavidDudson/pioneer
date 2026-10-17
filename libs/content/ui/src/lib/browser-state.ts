import type { FilterCondition } from '@pioneer/frontier';
import type { ContentKind } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/**
 * How much of the content browser shows. The tier changes density and which regions appear, never the state or where
 * the data comes from: `preview` is the entry alone (a hover), `panel` a narrow list with search for a side drawer, and
 * `page` the full width list with the facet panel and the column chooser.
 */
export const ContentBrowserTier = { Preview: 'preview', Panel: 'panel', Page: 'page' } as const;
export type ContentBrowserTier = ValueOf<typeof ContentBrowserTier>;

/** An entry as a link names it: its kind and the name part of its slug (`feat`, `power-attack`). */
export interface ContentEntryRef {
  readonly kind: ContentKind;
  readonly name: string;
}

/**
 * Everything a content browser is showing, as one plain value that every tier reads and writes. It holds no function
 * and no class, so it survives `JSON.stringify` (a saved panel, a link) and two browsers over the same value show the
 * same list.
 */
export interface ContentBrowserState {
  /** The kinds listed, in browser order. None means the browser's default kind. */
  readonly kinds: readonly ContentKind[];
  /** The words searched for; blank for none. */
  readonly query: string;
  /** The filter bar's conditions. */
  readonly filters: readonly FilterCondition[];
  /** The entry shown, if one is picked. */
  readonly selected?: ContentEntryRef | undefined;
}

/** A browser with nothing picked: the default kind, no words, no filters, no entry. */
export const EMPTY_BROWSER_STATE: ContentBrowserState = { kinds: [], query: '', filters: [] };

/** Whether two refs name the same entry. */
export function sameEntry(left: ContentEntryRef | undefined, right: ContentEntryRef | undefined): boolean {
  return left?.kind === right?.kind && left?.name === right?.name;
}
