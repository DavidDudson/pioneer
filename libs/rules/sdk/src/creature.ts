import { Uuid } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { AttributeModifiersWire } from './attribute';
import { Slug } from './content-id';
import { ContentText } from './content-text';
import { DamageAdjustment } from './damage';
import { SizeSchema } from './size';
import { Immunity, Trait } from './trait';
import { ArmorClass, Feet, HitPoints, Level, Modifier } from './units';

/** Id of a creature content entry (UUIDv5 of `<pack>/<slug>`). */
export const CreatureId = Uuid.brand<'CreatureId'>();
export type CreatureId = z.infer<typeof CreatureId>;

/** Schema every pack's creature (stat block) entries must satisfy. */
export const CreatureDefinition = z.object({
  slug: Slug,
  name: ContentText,
  /** -1 is valid for the weakest creatures. */
  level: Level,
  size: SizeSchema,
  traits: z.array(Trait).readonly(),
  perception: Modifier,
  attributes: AttributeModifiersWire,
  armorClass: ArmorClass,
  saves: z.object({ fortitude: Modifier, reflex: Modifier, will: Modifier }),
  hitPoints: HitPoints,
  immunities: z.array(Immunity).readonly(),
  weaknesses: z.array(DamageAdjustment).readonly(),
  resistances: z.array(DamageAdjustment).readonly(),
  speed: Feet,
});
export type CreatureDefinition = z.infer<typeof CreatureDefinition>;
