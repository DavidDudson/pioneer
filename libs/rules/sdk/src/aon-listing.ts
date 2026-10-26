import * as z from 'zod';

import { AonUrl } from './source-ref';

/** The heading AoN lists an entry under (`Feats`, `Spells`), as written there. */
export const AonListingType = z.string().min(1).brand<'AonListingType'>();
export type AonListingType = z.infer<typeof AonListingType>;

/** An entry's name as AoN prints it. */
export const AonEntryName = z.string().min(1).brand<'AonEntryName'>();
export type AonEntryName = z.infer<typeof AonEntryName>;

/** The `ETag` of a Sources page, sent back as `If-None-Match`. */
export const AonEtag = z.string().min(1).brand<'AonEtag'>();
export type AonEtag = z.infer<typeof AonEtag>;

/** One entry in a book's AoN listing: its type heading, name and exact URL (ADR-0071). */
export const AonListedEntry = z.strictObject({ type: AonListingType, name: AonEntryName, url: AonUrl });
export type AonListedEntry = z.infer<typeof AonListedEntry>;

/** `content/aon/<book>.json`: a book's name-to-URL table from its AoN Sources page, and the page's `ETag`. */
export const AonListingFile = z.strictObject({
  etag: AonEtag.optional(),
  entries: z.array(AonListedEntry),
});
export type AonListingFile = z.infer<typeof AonListingFile>;
