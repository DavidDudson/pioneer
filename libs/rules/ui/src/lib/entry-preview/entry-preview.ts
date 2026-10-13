import { InjectionToken } from '@angular/core';
import type { Provider } from '@angular/core';
import type { ContentId, ContentLevel, ContentText, Level, RichText, SourceRef } from '@pioneer/rules/sdk';

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
}

/** How a preview finds an entry. The page that shows it knows which content is loaded, so it provides this. */
export interface EntryPreviews {
  /** The entry's preview, or `undefined` when it isn't loaded (its reference then shows without one). */
  readonly preview: (id: ContentId) => EntryPreview | undefined;
}

const NO_PREVIEWS: EntryPreviews = { preview: (): undefined => undefined };

export const ENTRY_PREVIEWS = new InjectionToken<EntryPreviews>('ENTRY_PREVIEWS', {
  factory: (): EntryPreviews => NO_PREVIEWS,
});

/** Gives the references and rows below a page their previews. */
export function provideEntryPreviews(previews: EntryPreviews): Provider {
  return { provide: ENTRY_PREVIEWS, useValue: previews };
}
