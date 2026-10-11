import type { ContentId, RichText } from '@pioneer/rules/sdk';

import { foundryLinks } from './foundry-links';
import type { LinkedEntry } from './foundry-links';
import type { PackDocument } from './foundry-release';
import { htmlToRichText } from './html-rich-text';

/**
 * The description pass of the envelope translation: every selected document already has its entry id, so links
 * between entries resolve whichever comes first.
 */

/** Description markup `htmlToRichText` does not map (`span`, `table[class]`): its text is kept, the markup is not. */
export interface UnknownMarkup {
  readonly entry: ContentId;
  readonly markup: string;
}

/**
 * A description enricher, or part of one, that did not translate (`@UUID[spell-effects]`, a link outside the import;
 * `@Check[traits]`, a parameter with no place in a `Check`): the text is kept, the rest is not.
 */
export interface UntranslatedEnricher {
  readonly entry: ContentId;
  readonly enricher: string;
}

export interface EntryDescriptions {
  readonly descriptions: ReadonlyMap<ContentId, RichText>;
  readonly unknownMarkup: readonly UnknownMarkup[];
  readonly untranslatedEnrichers: readonly UntranslatedEnricher[];
}

/** Each entry's description as rich text, with links resolved against the entries and the release's `documents`. */
export function describeEntries(
  entries: readonly LinkedEntry[],
  documents: readonly PackDocument[],
): EntryDescriptions {
  const links = foundryLinks(documents, entries);
  const described = entries.map(({ source, id }) => ({
    id,
    translation: htmlToRichText(source.document.system.description?.value ?? '', links),
  }));
  return {
    descriptions: new Map(described.map(({ id, translation }) => [id, translation.richText])),
    unknownMarkup: described.flatMap(({ id, translation }) =>
      translation.unknownMarkup.map((markup) => ({ entry: id, markup })),
    ),
    untranslatedEnrichers: described.flatMap(({ id, translation }) =>
      translation.untranslatedEnrichers.map((enricher) => ({ entry: id, enricher })),
    ),
  };
}
