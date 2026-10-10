import type { ValueOf } from '@pioneer/shared/kernel';
import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeModifier } from './attribute';
import { Slug } from './content-id';
import { Hardness, physicalFields } from './physical-item';
import { ArmorCategory } from './rule-element-proficiency';
import { checkPropertyRunes, PropertyRunes, ReinforcingGrade, RuneGrade } from './rune';
import { Feet, HitPoints } from './units';

/** Armour categories, barding included; barding has no proficiency of its own. */
export const ArmorItemCategory = {
  ...ArmorCategory,
  LightBarding: 'light-barding',
  HeavyBarding: 'heavy-barding',
} as const;
export type ArmorItemCategory = ValueOf<typeof ArmorItemCategory>;

/** Remaster armour groups, Foundry pf2e's less Starfinder's. */
export const ArmorGroup = {
  Chain: 'chain',
  Cloth: 'cloth',
  Composite: 'composite',
  Leather: 'leather',
  Plate: 'plate',
  Skeletal: 'skeletal',
  Wood: 'wood',
} as const;
export type ArmorGroup = ValueOf<typeof ArmorGroup>;

/** A base armour (`leather-armor`) or shield (`steel-shield`): what a specific one is made from. */
const BaseArmor = Slug.brand<'BaseArmor'>();
const BaseShield = Slug.brand<'BaseShield'>();

/** The item bonus to AC armour or a raised shield gives. */
const AcBonus = Pg.smallint().nonnegative().brand<'AcBonus'>();

/** The most of the wearer's Dexterity modifier that counts toward AC. */
const DexCap = Pg.smallint().nonnegative().brand<'DexCap'>();

/** The size of the penalty armour gives to Strength- and Dexterity-based checks: 1 is "-1". */
const CheckPenalty = Pg.smallint().positive().brand<'CheckPenalty'>();

/** A specific magic armour's runes ("+1 resilient"); armour that isn't one has none. */
const ArmorRunes = z
  .strictObject({ potency: RuneGrade.optional(), resilient: RuneGrade.optional(), property: PropertyRunes })
  .check(checkPropertyRunes);

/**
 * Armour's `data` on the `ContentEntry` envelope. Penalties are their size: a check penalty of 1 is -1, a speed
 * penalty of 5 is -5 feet, as Foundry pf2e stores them negated.
 */
export const ArmorData = z.strictObject({
  ...physicalFields,
  category: z.enum(ArmorItemCategory),
  group: z.enum(ArmorGroup).optional(),
  baseItem: BaseArmor.optional(),
  acBonus: AcBonus,
  dexCap: DexCap.optional(),
  checkPenalty: CheckPenalty.optional(),
  speedPenalty: Feet.optional(),
  /** The Strength modifier at which the penalties go away. */
  strength: AttributeModifier.optional(),
  runes: ArmorRunes.optional(),
});
export type ArmorData = z.infer<typeof ArmorData>;

/**
 * A shield's `data` on the `ContentEntry` envelope: always held, so it has no usage. A shield that is also a weapon
 * says so with its `integrated-…` trait; a specific magic shield has its reinforcing rune.
 */
export const ShieldData = z.strictObject({
  ...physicalFields,
  baseItem: BaseShield.optional(),
  acBonus: AcBonus,
  hardness: Hardness,
  hitPoints: HitPoints,
  speedPenalty: Feet.optional(),
  runes: z.strictObject({ reinforcing: ReinforcingGrade }).optional(),
});
export type ShieldData = z.infer<typeof ShieldData>;
