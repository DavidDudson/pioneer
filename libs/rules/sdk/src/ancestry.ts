import { Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { ContentText } from './content-text';
import { SizeSchema } from './size';
import { Trait } from './trait';
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

/** An ancestry's `data` on the `ContentEntry` envelope: the definition less what the envelope carries. */
export const AncestryData = z.strictObject(AncestryDefinition.omit({ slug: true, name: true, traits: true }).shape);
export type AncestryData = z.infer<typeof AncestryData>;
