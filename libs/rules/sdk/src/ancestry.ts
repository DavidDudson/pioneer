import { UuidSchema } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { SlugSchema } from './content-id';
import { SizeSchema } from './size';
import { Feet, HitPoints } from './units';

/** Id of an ancestry content entry (UUIDv5 of `<pack>/<slug>`). */
export const AncestryId = UuidSchema.brand<'AncestryId'>();
export type AncestryId = z.infer<typeof AncestryId>;

/** Schema every pack's ancestry entries must satisfy. */
export const AncestryDefinition = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  hitPoints: HitPoints,
  size: SizeSchema,
  speedFeet: Feet,
  traits: z.array(SlugSchema).readonly(),
});
export type AncestryDefinition = z.infer<typeof AncestryDefinition>;
