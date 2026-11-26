import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Attribute, AttributeModifiersWire, AttributeSchema } from './attribute';
import { RuleSlug } from './rule-slug';
import { SizeSchema } from './size';
import { Feet, HitPoints } from './units';
import { WeaponDamage } from './weapon';

/** The skills a companion can have, with the attribute each one uses. A Lore is not one of them. */
export const CompanionSkill = {
  Acrobatics: 'acrobatics',
  Arcana: 'arcana',
  Athletics: 'athletics',
  Crafting: 'crafting',
  Deception: 'deception',
  Diplomacy: 'diplomacy',
  Intimidation: 'intimidation',
  Medicine: 'medicine',
  Nature: 'nature',
  Occultism: 'occultism',
  Performance: 'performance',
  Religion: 'religion',
  Society: 'society',
  Stealth: 'stealth',
  Survival: 'survival',
  Thievery: 'thievery',
} as const;

export type CompanionSkill = ValueOf<typeof CompanionSkill>;

export const CompanionSkillSchema = z.enum(CompanionSkill);

/** The attribute each skill adds. */
export const COMPANION_SKILL_ATTRIBUTE: Readonly<Record<CompanionSkill, Attribute>> = {
  [CompanionSkill.Acrobatics]: Attribute.Dexterity,
  [CompanionSkill.Arcana]: Attribute.Intelligence,
  [CompanionSkill.Athletics]: Attribute.Strength,
  [CompanionSkill.Crafting]: Attribute.Intelligence,
  [CompanionSkill.Deception]: Attribute.Charisma,
  [CompanionSkill.Diplomacy]: Attribute.Charisma,
  [CompanionSkill.Intimidation]: Attribute.Charisma,
  [CompanionSkill.Medicine]: Attribute.Wisdom,
  [CompanionSkill.Nature]: Attribute.Wisdom,
  [CompanionSkill.Occultism]: Attribute.Intelligence,
  [CompanionSkill.Performance]: Attribute.Charisma,
  [CompanionSkill.Religion]: Attribute.Wisdom,
  [CompanionSkill.Society]: Attribute.Intelligence,
  [CompanionSkill.Stealth]: Attribute.Dexterity,
  [CompanionSkill.Survival]: Attribute.Wisdom,
  [CompanionSkill.Thievery]: Attribute.Dexterity,
};

/** The other ways a companion moves, beside its land Speed. */
export const CompanionMovement = { Burrow: 'burrow', Climb: 'climb', Fly: 'fly', Swim: 'swim' } as const;

export type CompanionMovement = ValueOf<typeof CompanionMovement>;

export const CompanionMovements = z.partialRecord(z.enum(CompanionMovement), Feet).readonly();

export type CompanionMovements = z.infer<typeof CompanionMovements>;

/** One unarmed attack in a companion's stat block, before its tier adds dice and damage. */
export const CompanionAttack = z.strictObject({
  slug: RuleSlug,
  /** The attribute that adds to the attack and its damage: Strength, or Dexterity for a finesse attack. */
  attribute: AttributeSchema,
  damage: WeaponDamage,
});

export type CompanionAttack = z.infer<typeof CompanionAttack>;

/**
 * The part of an animal companion that belongs to its species rather than to its master (Player Core p. 206): size,
 * base attribute modifiers, ancestry Hit Points, the one extra trained skill, its land Speed and its unarmed attacks.
 * Content fills it in ([#2139](https://github.com/DavidDudson/pioneer/issues/2139)); the engine derives the rest from it,
 * the master's level and the tier.
 */
export const CompanionStatBlock = z.strictObject({
  size: SizeSchema,
  attributes: AttributeModifiersWire,
  ancestryHp: HitPoints,
  extraSkill: CompanionSkillSchema,
  speed: Feet,
  /** Burrow, climb, fly and swim Speeds, where the species has them. */
  movement: CompanionMovements.optional(),
  attacks: z.array(CompanionAttack).min(1).readonly(),
});

export type CompanionStatBlock = z.infer<typeof CompanionStatBlock>;
