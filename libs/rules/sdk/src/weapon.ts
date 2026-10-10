import type { ValueOf } from '@pioneer/shared/kernel';
import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { DamageTypeSchema } from './damage';
import { DamageFormula } from './damage-formula';
import { ItemCount, physicalFields, Usage } from './physical-item';
import { WeaponCategory } from './rule-element-proficiency';
import { checkPropertyRunes, PropertyRunes, RuneGrade } from './rune';
import { DamageAmount, Feet } from './units';

/** Remaster weapon groups, Foundry pf2e's less Starfinder's. */
export const WeaponGroup = {
  Axe: 'axe',
  Bomb: 'bomb',
  Bow: 'bow',
  Brawling: 'brawling',
  Club: 'club',
  Crossbow: 'crossbow',
  Dart: 'dart',
  Firearm: 'firearm',
  Flail: 'flail',
  Hammer: 'hammer',
  Knife: 'knife',
  Pick: 'pick',
  Polearm: 'polearm',
  Shield: 'shield',
  Sling: 'sling',
  Spear: 'spear',
  Sword: 'sword',
} as const;
export type WeaponGroup = ValueOf<typeof WeaponGroup>;

/** A base weapon (`longsword`): what a specific weapon is made from, and a deity's favoured weapon. */
export const BaseWeapon = Slug.brand<'BaseWeapon'>();
export type BaseWeapon = z.infer<typeof BaseWeapon>;

/** The die a weapon rolls for damage. */
export const DieSize = { D4: 'd4', D6: 'd6', D8: 'd8', D10: 'd10', D12: 'd12' } as const;
export type DieSize = ValueOf<typeof DieSize>;

/** How many damage dice a weapon rolls before striking runes add more. */
const DiceCount = Pg.smallint().positive().brand<'DiceCount'>();

/** "1d6 fire persistent": a formula, as damage writes it, and its type. */
const PersistentDamage = z.strictObject({ formula: DamageFormula, damageType: DamageTypeSchema });

/** "1d8 slashing", with persistent damage for bombs ("1d8 fire, 1 persistent fire"). */
const WeaponDamage = z.strictObject({
  dice: DiceCount,
  die: z.enum(DieSize),
  damageType: DamageTypeSchema,
  persistent: PersistentDamage.optional(),
});

/** A kind of ammunition (`arrows`, `bolts`, `rounds-flintlock-musket`). Foundry pf2e keeps the set in config. */
export const AmmunitionType = Slug.brand<'AmmunitionType'>();
export type AmmunitionType = z.infer<typeof AmmunitionType>;

/** What a weapon fires, and how many it holds loaded when it holds more than one at a time. */
const WeaponAmmunition = z.strictObject({ type: AmmunitionType, capacity: ItemCount.optional() });

/** The actions it takes to reload: 0 for a bow, 1 for most firearms, 10 for a cannon. */
const ReloadActions = Pg.smallint().nonnegative().brand<'ReloadActions'>();

const ITEM_BONUS_MAX = 4;

/** An item bonus to attack rolls the weapon has without runes: +1 on a moderate bomb. */
const ItemBonus = Pg.smallint().positive().max(ITEM_BONUS_MAX).brand<'ItemBonus'>();

/** A specific magic weapon's runes ("+1 striking flaming"); a weapon that isn't one has none. */
const WeaponRunes = z
  .strictObject({ potency: RuneGrade.optional(), striking: RuneGrade.optional(), property: PropertyRunes })
  .check(checkPropertyRunes);

/**
 * A weapon's `data` on the `ContentEntry` envelope, alchemical bombs included, as in Foundry pf2e. Its traits are
 * the envelope's (`versatile-p`, `thrown-20`); a specific magic weapon has the runes it comes with.
 */
export const WeaponData = z.strictObject({
  ...physicalFields,
  category: z.enum(WeaponCategory),
  group: z.enum(WeaponGroup).optional(),
  baseItem: BaseWeapon.optional(),
  damage: WeaponDamage,
  /** Splash damage, on a bomb. */
  splash: DamageAmount.optional(),
  itemBonus: ItemBonus.optional(),
  /** The range increment of a ranged or thrown weapon. */
  range: Feet.optional(),
  reload: ReloadActions.optional(),
  ammunition: WeaponAmmunition.optional(),
  usage: Usage,
  runes: WeaponRunes.optional(),
});
export type WeaponData = z.infer<typeof WeaponData>;
