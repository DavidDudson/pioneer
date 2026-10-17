import { Pg, Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ATTRIBUTE_MODIFIER_MIN } from './attribute';
import { EntrySlug } from './content-id';
import { ContentText } from './content-text';
import { creatureStatBlockFields } from './creature-stat-block';
import { DamageAdjustment } from './damage';
import { SizeSchema } from './size';
import { Immunity, Trait } from './trait';
import { ArmorClass, Feet, HitPoints, Level, Modifier } from './units';

/** The highest attribute modifier a stat block prints: an ancient dragon's Strength is +12, past a character's +7. */
const CREATURE_ATTRIBUTE_MAX = 15;

/** A creature's attribute modifier, which runs higher than a character's but no lower. */
const CreatureAttributeModifier = Pg.smallint()
  .min(ATTRIBUTE_MODIFIER_MIN)
  .max(CREATURE_ATTRIBUTE_MAX)
  .brand<'CreatureAttributeModifier'>();
type CreatureAttributeModifier = z.infer<typeof CreatureAttributeModifier>;

/** The six attribute modifiers on a stat block. */
const CreatureAttributes = z.object({
  str: CreatureAttributeModifier,
  dex: CreatureAttributeModifier,
  con: CreatureAttributeModifier,
  int: CreatureAttributeModifier,
  wis: CreatureAttributeModifier,
  cha: CreatureAttributeModifier,
});
type CreatureAttributes = z.infer<typeof CreatureAttributes>;

/** Id of a creature content entry (UUIDv5 of `<pack>/<slug>`). */
export const CreatureId = Uuid.brand<'CreatureId'>();
export type CreatureId = z.infer<typeof CreatureId>;

/** Schema every pack's creature (stat block) entries must satisfy. */
export const CreatureDefinition = z.object({
  slug: EntrySlug,
  name: ContentText,
  /** -1 is valid for the weakest creatures. */
  level: Level,
  size: SizeSchema,
  traits: z.array(Trait).readonly(),
  perception: Modifier,
  attributes: CreatureAttributes,
  armorClass: ArmorClass,
  saves: z.object({ fortitude: Modifier, reflex: Modifier, will: Modifier }),
  hitPoints: HitPoints,
  immunities: z.array(Immunity).readonly(),
  weaknesses: z.array(DamageAdjustment).readonly(),
  resistances: z.array(DamageAdjustment).readonly(),
  speed: Feet,
  ...creatureStatBlockFields,
});
export type CreatureDefinition = z.infer<typeof CreatureDefinition>;

/** A creature's `data` on the `ContentEntry` envelope: the stat block less what the envelope carries. */
export const CreatureData = z.strictObject(
  CreatureDefinition.omit({ slug: true, name: true, level: true, traits: true }).shape,
);
export type CreatureData = z.infer<typeof CreatureData>;

/** What a target ignores, takes extra from, and shrugs off: the IWR lines of its stat block, or a character's. */
export const DamageTarget = CreatureDefinition.pick({ immunities: true, weaknesses: true, resistances: true });
export type DamageTarget = z.infer<typeof DamageTarget>;

/** A target with no immunities, weaknesses or resistances. */
export const NO_DEFENCES: DamageTarget = { immunities: [], weaknesses: [], resistances: [] };
