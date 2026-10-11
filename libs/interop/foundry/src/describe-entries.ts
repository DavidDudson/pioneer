import type { ContentId, RichText } from '@pioneer/rules/sdk';

import { expandLocalize } from './foundry-lang';
import type { UnresolvedText } from './foundry-lang';
import { foundryLinks } from './foundry-links';
import type { LinkedEntry } from './foundry-links';
import type { FoundryLang, PackDocument } from './foundry-release';
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
  /** `@Localize` keys with no English text. */
  readonly unresolvedText: readonly UnresolvedText[];
}

/**
 * Each entry's description as rich text, with `@Localize` inlined from `lang` and links resolved against the
 * entries and the release's `documents`.
 */
export function describeEntries(
  entries: readonly LinkedEntry[],
  documents: readonly PackDocument[],
  lang: FoundryLang,
): EntryDescriptions {
  const links = foundryLinks(documents, entries);
  const described = entries.map(({ source: { document }, id }) => {
    const html = expandLocalize(document.system.description?.value ?? '', lang, { item: document.name });
    return { id, translation: htmlToRichText(html.text, links), unresolved: html.unresolved };
  });
  return {
    descriptions: new Map(described.map(({ id, translation }) => [id, translation.richText])),
    unknownMarkup: described.flatMap(({ id, translation }) =>
      translation.unknownMarkup.map((markup) => ({ entry: id, markup })),
    ),
    untranslatedEnrichers: described.flatMap(({ id, translation }) =>
      translation.untranslatedEnrichers.map((enricher) => ({ entry: id, enricher })),
    ),
    unresolvedText: described.flatMap(({ id, unresolved }) => unresolved.map((each) => ({ entry: id, ...each }))),
  };
}
