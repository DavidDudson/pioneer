import * as z from 'zod';

/**
 * Text that comes from a content pack (names, titles). The `en` source until
 * per-locale text bundles land (ADR-0009); never built in code.
 */
export const ContentText = z.string().min(1).brand<'ContentText'>();
export type ContentText = z.infer<typeof ContentText>;
