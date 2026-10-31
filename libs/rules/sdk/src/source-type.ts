import type { ValueOf } from '@pioneer/shared/kernel';

import type { Book } from './book';
import { ProductLine } from './book';
import type { ContentLicense } from './license';
import { isLegacyLicense } from './license';
import { SourceKind } from './source-ref';
import type { SourceRef } from './source-ref';

/** Whether a source is from the remaster or from before it. */
export const SourceEdition = { Remaster: 'remaster', Legacy: 'legacy' } as const;
export type SourceEdition = ValueOf<typeof SourceEdition>;

/**
 * What kind of source a citation is, which the source badge colours by: AoN's product line crossed with the edition,
 * then homebrew, a web page, and one fallback for everything else (a book Pioneer does not register, a comic).
 */
export const SourceType = {
  RulebookRemaster: 'rulebook-remaster',
  RulebookLegacy: 'rulebook-legacy',
  LostOmensRemaster: 'lost-omens-remaster',
  LostOmensLegacy: 'lost-omens-legacy',
  CampaignRemaster: 'campaign-remaster',
  CampaignLegacy: 'campaign-legacy',
  AdventureRemaster: 'adventure-remaster',
  AdventureLegacy: 'adventure-legacy',
  SocietyRemaster: 'society-remaster',
  SocietyLegacy: 'society-legacy',
  Homebrew: 'homebrew',
  Web: 'web',
  Unknown: 'unknown',
} as const;
export type SourceType = ValueOf<typeof SourceType>;

/** The type of each product line, by edition. Comics, April Fools and blog posts are not here: they are `Unknown`. */
const BOOK_TYPES: Readonly<Partial<Record<ProductLine, Readonly<Record<SourceEdition, SourceType>>>>> = {
  [ProductLine.Rulebooks]: {
    [SourceEdition.Remaster]: SourceType.RulebookRemaster,
    [SourceEdition.Legacy]: SourceType.RulebookLegacy,
  },
  [ProductLine.LostOmens]: {
    [SourceEdition.Remaster]: SourceType.LostOmensRemaster,
    [SourceEdition.Legacy]: SourceType.LostOmensLegacy,
  },
  [ProductLine.AdventurePaths]: {
    [SourceEdition.Remaster]: SourceType.CampaignRemaster,
    [SourceEdition.Legacy]: SourceType.CampaignLegacy,
  },
  [ProductLine.Adventures]: {
    [SourceEdition.Remaster]: SourceType.AdventureRemaster,
    [SourceEdition.Legacy]: SourceType.AdventureLegacy,
  },
  [ProductLine.Society]: {
    [SourceEdition.Remaster]: SourceType.SocietyRemaster,
    [SourceEdition.Legacy]: SourceType.SocietyLegacy,
  },
};

/** What a citation needs to be typed: the source, its book when it names one the registry holds, and the entry's licence. */
export interface SourceTypeInput {
  readonly source: SourceRef;
  readonly book: Book | undefined;
  /** The licence of the entry that cites the source (`effectiveLicense`): OGL makes it legacy even in a remaster book. */
  readonly license: ContentLicense;
}

/** A book is legacy when it is not remaster, or the entry it holds is Open Game License content. */
function editionOf(book: Book, license: ContentLicense): SourceEdition {
  return book.remaster && !isLegacyLicense(license) ? SourceEdition.Remaster : SourceEdition.Legacy;
}

/** The type of a citation, which picks its colour. */
export function sourceType({ source, book, license }: SourceTypeInput): SourceType {
  if (source.kind === SourceKind.Homebrew) {
    return SourceType.Homebrew;
  }
  if (source.kind === SourceKind.Web) {
    return SourceType.Web;
  }
  const line = book?.productLine;
  const types = line === undefined ? undefined : BOOK_TYPES[line];
  return book === undefined || types === undefined ? SourceType.Unknown : types[editionOf(book, license)];
}
