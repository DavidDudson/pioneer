import * as z from 'zod';

/**
 * A variant rule's `data` on the `ContentEntry` envelope: none yet. What it changes (Free Archetype's extra feat
 * slots) is in `rules`, applied to every character of a campaign that enables it.
 */
export const VariantRuleData = z.strictObject({});
export type VariantRuleData = z.infer<typeof VariantRuleData>;
