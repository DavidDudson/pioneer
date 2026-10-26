import * as z from 'zod';

import { EntrySlug } from './content-id';
import { AonUrl, BookId, PageNumber } from './source-ref';

/**
 * Where one entry is in print and on Archives of Nethys: its book, and its page and AoN entry once known
 * (ADR-0070). A book alone is valid; the coverage report shows what is still missing.
 */
export const EnrichmentMapping = z.strictObject({
  book: BookId,
  page: PageNumber.optional(),
  aon: AonUrl.optional(),
});
export type EnrichmentMapping = z.infer<typeof EnrichmentMapping>;

/** `content/enrichment/<pack>.json`: entry slug to its mapping. */
export const EnrichmentMappingFile = z.record(EntrySlug, EnrichmentMapping);
export type EnrichmentMappingFile = z.infer<typeof EnrichmentMappingFile>;
