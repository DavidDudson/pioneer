import { InjectionToken } from '@angular/core';
import type { ReviewedName, ReviewedRuneId } from '@pioneer/campaign/domain';

/** A content entry the GM can pick for a key item: its id, and the name the campaign shows for it. */
export interface ContentChoice {
  readonly id: ReviewedRuneId;
  readonly name: ReviewedName;
}

/**
 * Port to the rules content for the base item and the runes of a key item. The campaign context knows content only by
 * id and name and may not import the rules libraries, so the app provides the search (`KEY_ITEM_CONTENT_SEARCH`).
 */
export interface KeyItemContentSearch {
  /** The items a key item can be, whose names match `words`, best first. */
  readonly items: (words: string) => Promise<readonly ContentChoice[]>;
  /** The runes a key item can carry, whose names match `words`, best first. */
  readonly runes: (words: string) => Promise<readonly ContentChoice[]>;
}

/** Finds nothing, until the app provides a search. */
const FINDS_NOTHING: KeyItemContentSearch = {
  items: async () => [],
  runes: async () => [],
};

export const KEY_ITEM_CONTENT_SEARCH = new InjectionToken<KeyItemContentSearch>('KEY_ITEM_CONTENT_SEARCH', {
  factory: (): KeyItemContentSearch => FINDS_NOTHING,
});
