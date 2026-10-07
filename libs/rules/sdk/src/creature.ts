import { Pg, UuidSchema } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { AttributeModifiersWire } from './attribute';
import { SlugSchema } from './content-id';
import { SizeSchema } from './size';
import { Feet, HitPoints } from './units';

/** Id of a creature content entry (UUIDv5 of `<pack>/<slug>`). */
export const CreatureId = UuidSchema.brand<'CreatureId'>();
export type CreatureId = z.infer<typeof CreatureId>;

/** Highest creature level in the remastered rules. */
const CREATURE_LEVEL_MAX = 25;

const DamageAdjustment = z.object({ type: SlugSchema, value: Pg.smallint().positive() });

/** Schema every pack's creature (stat block) entries must satisfy. */
export const CreatureDefinition = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  /** Creature level; -1 is valid for the weakest creatures. */
  level: Pg.smallint().min(-1).max(CREATURE_LEVEL_MAX),
  size: SizeSchema,
  traits: z.array(SlugSchema).readonly(),
  perception: Pg.smallint(),
  attributes: AttributeModifiersWire,
  armorClass: Pg.smallint(),
  saves: z.object({ fortitude: Pg.smallint(), reflex: Pg.smallint(), will: Pg.smallint() }),
  hitPoints: HitPoints,
  immunities: z.array(SlugSchema).readonly(),
  weaknesses: z.array(DamageAdjustment).readonly(),
  resistances: z.array(DamageAdjustment).readonly(),
  speedFeet: Feet,
});
export type CreatureDefinition = z.infer<typeof CreatureDefinition>;
