/**
 * Message keys the source line renders with, spelled out so the key check sees them. Phrases are whole where no link
 * sits inside them ("{title} p. {page}", "{pack} by {author}"), so a locale can reorder them; separators and joins
 * are messages too, spaces included.
 */
export const SourceLineMessage = {
  BookPage: 'rules.sourceLine.bookPage',
  PartSeparator: 'rules.sourceLine.partSeparator',
  Aon: 'rules.sourceLine.aon',
  AonLabel: 'rules.sourceLine.aonLabel',
  AonLabelNoPage: 'rules.sourceLine.aonLabelNoPage',
  UnregisteredBook: 'rules.sourceLine.unregisteredBook',
  Homebrew: 'rules.sourceLine.homebrew',
  HomebrewUnknownAuthor: 'rules.sourceLine.homebrewUnknownAuthor',
  /** After a linked pack name: " by {author}". */
  ByAuthor: 'rules.sourceLine.byAuthor',
  ByUnknownAuthor: 'rules.sourceLine.byUnknownAuthor',
  Separator: 'rules.sourceLine.separator',
} as const;
