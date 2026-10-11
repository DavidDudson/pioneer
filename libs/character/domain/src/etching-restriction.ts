import { ArmorCategory, ArmorGroup, ContentKind, DamageType } from '@pioneer/rules/sdk';
import type { ArmorItemCategory, EtchingRestriction } from '@pioneer/rules/sdk';

import type { ItemEntry } from './inventory-content';

type WeaponEntry = Extract<ItemEntry, { readonly kind: typeof ContentKind.Weapon }>;
type ArmorEntry = Extract<ItemEntry, { readonly kind: typeof ContentKind.Armor }>;

/** Versatile traits, by the damage type each adds. */
const VERSATILE: Readonly<Record<string, DamageType>> = {
  'versatile-b': DamageType.Bludgeoning,
  'versatile-p': DamageType.Piercing,
  'versatile-s': DamageType.Slashing,
};

/** The damage types a weapon deals: its own, and any its versatile traits add. */
function damageTypes(weapon: WeaponEntry): ReadonlySet<DamageType> {
  const added = weapon.traits.flatMap((trait) => {
    const type = VERSATILE[trait];
    return type === undefined ? [] : [type];
  });
  return new Set([weapon.data.damage.damageType, ...added]);
}

/** A ranged weapon has a range increment; a thrown melee weapon has its range in its `thrown-<n>` trait instead. */
function isMelee(weapon: WeaponEntry): boolean {
  return weapon.data.range === undefined;
}

function deals(weapon: WeaponEntry, ...types: readonly DamageType[]): boolean {
  const dealt = damageTypes(weapon);
  return types.some((type) => dealt.has(type));
}

const WEAPON_CHECKS: Readonly<Record<string, (weapon: WeaponEntry) => boolean>> = {
  melee: isMelee,
  thrown: (weapon) => weapon.traits.some((trait) => trait === 'thrown' || trait.startsWith('thrown-')),
  bludgeoning: (weapon) => deals(weapon, DamageType.Bludgeoning),
  'slashing-melee': (weapon) => isMelee(weapon) && deals(weapon, DamageType.Slashing),
  'piercing-or-slashing-melee': (weapon) => isMelee(weapon) && deals(weapon, DamageType.Piercing, DamageType.Slashing),
  'piercing-or-slashing': (weapon) => deals(weapon, DamageType.Piercing, DamageType.Slashing),
  'clan-dagger': (weapon) => weapon.data.baseItem === 'clan-dagger',
};

/** The armour groups made of metal. */
const METAL: ReadonlySet<ArmorGroup> = new Set([ArmorGroup.Chain, ArmorGroup.Composite, ArmorGroup.Plate]);

function isMetal(armor: ArmorEntry): boolean {
  return armor.data.group !== undefined && METAL.has(armor.data.group);
}

function isCategory(armor: ArmorEntry, ...categories: readonly ArmorItemCategory[]): boolean {
  return categories.includes(armor.data.category);
}

const ARMOR_CHECKS: Readonly<Record<string, (armor: ArmorEntry) => boolean>> = {
  light: (armor) => isCategory(armor, ArmorCategory.Light),
  heavy: (armor) => isCategory(armor, ArmorCategory.Heavy),
  metal: isMetal,
  'medium-or-heavy': (armor) => isCategory(armor, ArmorCategory.Medium, ArmorCategory.Heavy),
  'medium-or-heavy-metal': (armor) => isCategory(armor, ArmorCategory.Medium, ArmorCategory.Heavy) && isMetal(armor),
  'light-or-medium-nonmetal': (armor) =>
    isCategory(armor, ArmorCategory.Light, ArmorCategory.Medium) && !isMetal(armor),
};

/**
 * Whether `entry` meets a property rune's etching restriction, for each restriction the content importer writes:
 * melee or thrown weapons, weapons by damage type (versatile traits count), a clan dagger, and armour by category
 * and metal (chain, composite and plate). A restriction with no check here is not refused.
 */
export function meetsRestriction(entry: ItemEntry | undefined, restriction: EtchingRestriction | undefined): boolean {
  if (restriction === undefined) {
    return true;
  }
  if (entry?.kind === ContentKind.Weapon) {
    return WEAPON_CHECKS[restriction]?.(entry) ?? true;
  }
  if (entry?.kind === ContentKind.Armor) {
    return ARMOR_CHECKS[restriction]?.(entry) ?? true;
  }
  return true;
}
