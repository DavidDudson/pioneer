import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { PackId, Slug } from './content-id';
import { RulesMessage } from './messages';

/** A published book's id in the book registry: `player-core`, `gm-core`. */
export const BookId = Slug.brand<'BookId'>();
export type BookId = z.infer<typeof BookId>;

export const PageNumber = Pg.smallint().positive().brand<'PageNumber'>();
export type PageNumber = z.infer<typeof PageNumber>;

const URL_LENGTH_MAX = 2048;
const TITLE_LENGTH_MAX = 200;

/** One entry on Archives of Nethys, never a search page: `https://2e.aonprd.com/Feats.aspx?ID=4689`. */
const AON_ENTRY = /^https:\/\/2e\.aonprd\.com\/[A-Za-z]+\.aspx\?ID=\d+$/u;

export const AonUrl = z
  .string()
  .max(URL_LENGTH_MAX)
  .refine((value) => AON_ENTRY.test(value), issueParams(message(RulesMessage.AonUrl)))
  .brand<'AonUrl'>();
export type AonUrl = z.infer<typeof AonUrl>;

export const WebUrl = z
  .url({ protocol: /^https?$/u })
  .max(URL_LENGTH_MAX)
  .brand<'WebUrl'>();
export type WebUrl = z.infer<typeof WebUrl>;

/** The title of a web source, as its author gave it (not translated). */
export const SourceTitle = z.string().min(1).max(TITLE_LENGTH_MAX).brand<'SourceTitle'>();
export type SourceTitle = z.infer<typeof SourceTitle>;

export const SourceKind = {
  Book: 'book',
  Web: 'web',
  Homebrew: 'homebrew',
} as const;
export type SourceKind = ValueOf<typeof SourceKind>;

const BookSource = z
  .strictObject({
    kind: z.literal(SourceKind.Book),
    book: BookId,
    page: PageNumber.optional(),
    aon: AonUrl.optional(),
  })
  .refine(
    (source) => source.page !== undefined || source.aon !== undefined,
    issueParams(message(RulesMessage.BookLocation)),
  );

const WebSource = z.strictObject({
  kind: z.literal(SourceKind.Web),
  url: WebUrl,
  title: SourceTitle.optional(),
});

const HomebrewSource = z.strictObject({
  kind: z.literal(SourceKind.Homebrew),
  author: UserId,
  pack: PackId,
  url: WebUrl.optional(),
});

/**
 * Where a piece of content comes from (ADR-0005): a book page and/or its AoN entry, a web page,
 * or a homebrew pack and its author.
 */
export const SourceRef = z.discriminatedUnion('kind', [BookSource, WebSource, HomebrewSource]);
export type SourceRef = z.infer<typeof SourceRef>;
