import * as z from 'zod';

import { AonListedEntry } from './aon-listing';
import { AonUrl, PageNumber } from './source-ref';

/** `content/aon/pages/<book>.json`: the page AoN prints for each of a book's entries, by the entry's URL (ADR-0073). */
export const AonPagesFile = z.strictObject({
  pages: z.record(AonUrl, PageNumber),
  /** Entries the index holds that the book's Sources page does not list (ADR-0074): actions, for one. */
  entries: z.array(AonListedEntry).default([]),
});
export type AonPagesFile = z.infer<typeof AonPagesFile>;
