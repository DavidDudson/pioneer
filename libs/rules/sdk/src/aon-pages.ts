import * as z from 'zod';

import { AonUrl, PageNumber } from './source-ref';

/** `content/aon/pages/<book>.json`: the page AoN prints for each of a book's entries, by the entry's URL (ADR-0073). */
export const AonPagesFile = z.strictObject({ pages: z.record(AonUrl, PageNumber) });
export type AonPagesFile = z.infer<typeof AonPagesFile>;
