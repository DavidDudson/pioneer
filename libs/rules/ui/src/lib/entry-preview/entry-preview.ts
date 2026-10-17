import { InjectionToken } from '@angular/core';
import type { Provider } from '@angular/core';
import type { LinkTarget } from '@pioneer/frontier';
import type { BreakdownLine } from '@pioneer/rules/engine';
import type {
  ConditionValue,
  ContentId,
  ContentLevel,
  ContentText,
  Level,
  RichText,
  SourceRef,
} from '@pioneer/rules/sdk';

import type { StatBlockCreature } from '../creature-stat-block/creature-stat-block';

/** One line an entry adds to a statistic of the character the preview is for. */
export interface PreviewEffect {
  /** The statistic's name ("Perception"). */
  readonly statistic: string;
  readonly line: BreakdownLine;
}

/** What a preview shows of an entry: enough to recognise it without leaving the page. */
export interface EntryPreview {
  readonly name: ContentText;
  /** An item's or feat's level; a creature's is a character-level brand. */
  readonly level: ContentLevel | Level | undefined;
  /** Trait names as content gives them. */
  readonly traits: readonly string[];
  /** The start of the entry's description, clamped by the preview. */
  readonly summary: RichText;
  readonly sources: readonly SourceRef[];
  /** The value of a valued condition the character has (frightened 2), shown beside the name. */
  readonly value?: ConditionValue;
  /**
   * The lines the entry adds to the character's statistics, with its value applied. Absent when the preview is not
   * for an entry the character has; empty when it changes nothing.
   */
  readonly effects?: readonly PreviewEffect[];
  /** A creature's stat block, shown in place of the generic card. */
  readonly creature?: StatBlockCreature;
}

/** How a preview finds an entry. The page that shows it knows which content is loaded, so it provides this. */
export interface EntryPreviews {
  /** The entry's preview, or `undefined` when it isn't loaded (its reference then shows without one). */
  readonly preview: (id: ContentId) => EntryPreview | undefined;
  /**
   * Fetches the preview of an entry `preview` doesn't hold, when its card first opens. Resolves `undefined` for an
   * entry that doesn't exist and rejects when the fetch fails. A page that holds all it previews leaves it out; with
   * it, every reference is previewable, and the card shows a skeleton until the fetch settles.
   */
  readonly load?: (id: ContentId) => Promise<EntryPreview | undefined>;
  /** Where the entry opens in full (its page or panel), for the card's link; none when the page can't open it. */
  readonly target?: (id: ContentId) => LinkTarget | undefined;
}

const NO_PREVIEWS: EntryPreviews = { preview: (): undefined => undefined };

export const ENTRY_PREVIEWS = new InjectionToken<EntryPreviews>('ENTRY_PREVIEWS', {
  factory: (): EntryPreviews => NO_PREVIEWS,
});

/** Gives the references and rows below a page their previews. */
export function provideEntryPreviews(previews: EntryPreviews): Provider {
  return { provide: ENTRY_PREVIEWS, useValue: previews };
}

/** Whether `previews` can show a card for `id`: it holds the entry, or can fetch it when the card opens. */
export function canPreview(previews: EntryPreviews, id: ContentId): boolean {
  return previews.load !== undefined || previews.preview(id) !== undefined;
}
