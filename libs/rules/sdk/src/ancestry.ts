import { Pg, Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeBoost, Attributes } from './attribute';
import { ContentId, Slug } from './content-id';
import { ContentText } from './content-text';
import { SizeSchema } from './size';
import { Trait } from './trait';
import { uniqueItems } from './unique-items';
import { Feet, HitPoints } from './units';

/** Id of an ancestry content entry (UUIDv5 of `<pack>/<slug>`). */
export const AncestryId = Uuid.brand<'AncestryId'>();
export type AncestryId = z.infer<typeof AncestryId>;

/** Schema every pack's ancestry entries must satisfy. */
export const AncestryDefinition = z.object({
  slug: Slug,
  name: ContentText,
  hitPoints: HitPoints,
  size: SizeSchema,
  speed: Feet,
  traits: z.array(Trait).readonly(),
});
export type AncestryDefinition = z.infer<typeof AncestryDefinition>;

/** How many languages a character picks beyond those granted; the Intelligence modifier adds to it. */
const LanguageCount = Pg.smallint().nonnegative().brand<'LanguageCount'>();

const BOOSTS_MAX = 4;
const LANGUAGES_MAX = 64;

/** The languages an ancestry offers on top of those it grants (Foundry pf2e's `additionalLanguages`). */
const AdditionalLanguages = z.strictObject({
  count: LanguageCount,
  /** `language` entries to pick from. */
  options: z.array(ContentId).max(LANGUAGES_MAX).readonly().check(uniqueItems),
});

/**
 * An ancestry's `data` on the `ContentEntry` envelope: the definition less what the envelope carries, and the rest
 * of what Foundry pf2e stores for it. Its features (Darkvision as an ancestry feature, a heritage choice) are in
 * `rules`.
 */
export const AncestryData = z.strictObject({
  ...AncestryDefinition.omit({ slug: true, name: true, traits: true }).shape,
  boosts: z.array(AttributeBoost).max(BOOSTS_MAX).readonly(),
  flaws: Attributes,
  /** `language` entries every member speaks. */
  languages: z.array(ContentId).max(LANGUAGES_MAX).readonly().check(uniqueItems),
  additionalLanguages: AdditionalLanguages,
  /** The `sense` entry for its vision (darkvision, low-light vision); absent for ordinary vision. */
  vision: ContentId.optional(),
  reach: Feet,
});
export type AncestryData = z.infer<typeof AncestryData>;
