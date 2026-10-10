import { Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { ContentText } from './content-text';
import { RuleElements } from './rule-element';
import { SourceRef } from './source-ref';

/**
 * A variant rule's `data` on the `ContentEntry` envelope: none yet. What it changes (Free Archetype's extra feat
 * slots) is in `rules`, applied to every character of a campaign that enables it.
 */
export const VariantRuleData = z.strictObject({});
export type VariantRuleData = z.infer<typeof VariantRuleData>;

/** Id of a variant rule content entry (UUIDv5 of `<pack>/<slug>`). */
export const VariantRuleId = Uuid.brand<'VariantRuleId'>();
export type VariantRuleId = z.infer<typeof VariantRuleId>;

const SOURCES_MAX = 16;

/**
 * A variant rule as a pack defines it (GM Core's Proficiency Without Level): what it changes is in `rules`, put in
 * play for every character it is enabled for, each element's origin naming the variant. `sources` are where it is
 * written, since every breakdown line it explains cites them.
 */
export const VariantRuleDefinition = z.strictObject({
  slug: Slug,
  name: ContentText,
  sources: z.array(SourceRef).min(1).max(SOURCES_MAX),
  rules: RuleElements,
});
export type VariantRuleDefinition = z.infer<typeof VariantRuleDefinition>;
