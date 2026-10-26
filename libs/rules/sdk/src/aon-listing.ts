import * as z from 'zod';

import { AonUrl } from './source-ref';

/** One entry in a book's AoN listing: its type heading, name and exact URL (ADR-0071). */
export const AonListedEntry = z.strictObject({ type: z.string(), name: z.string(), url: AonUrl });
export type AonListedEntry = z.infer<typeof AonListedEntry>;

/** `content/aon/<book>.json`: a book's name-to-URL table from its AoN Sources page, and the page's `ETag`. */
export const AonListingFile = z.strictObject({
  etag: z.string().optional(),
  entries: z.array(AonListedEntry),
});
export type AonListingFile = z.infer<typeof AonListingFile>;
