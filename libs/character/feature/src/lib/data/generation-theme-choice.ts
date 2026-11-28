import { favouring, NEUTRAL_THEME, withWeapon } from '@pioneer/character/domain';
import type { GenerationTheme, WeaponTheme } from '@pioneer/character/domain';
import type { Attribute, BaseWeapon, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';

/**
 * What the generate dialog's theme controls hold: the attributes to favour and the weapon, a category with a group,
 * a base or both.
 */
export interface GenerationThemeChoice {
  readonly favoured: ReadonlyArray<Attribute>;
  readonly category: WeaponCategory | undefined;
  readonly group: WeaponGroup | undefined;
  readonly base: BaseWeapon | undefined;
}

/** A choice that favours nothing and names no weapon. */
export const NO_THEME_CHOICE: GenerationThemeChoice = {
  favoured: [],
  category: undefined,
  group: undefined,
  base: undefined,
};

/** The weapon a category with a group or a base names, with only the parts that are set, or undefined when it names none. */
function weaponOf(
  category: WeaponCategory | undefined,
  group: WeaponGroup | undefined,
  base: BaseWeapon | undefined,
): WeaponTheme | undefined {
  if (category === undefined || (group === undefined && base === undefined)) {
    return undefined;
  }

  const weapon: WeaponTheme = { category };

  if (group !== undefined) {
    weapon.group = group;
  }

  if (base !== undefined) {
    weapon.base = base;
  }

  return weapon;
}

/**
 * The theme `choice` asks for, or undefined when it asks for none, so the request carries no theme at all. A weapon
 * needs its category and a group or a base; with only a category, or a group or base without one, the weapon is left
 * out.
 */
export function themeOfChoice({ favoured, category, group, base }: GenerationThemeChoice): GenerationTheme | undefined {
  const weapon = weaponOf(category, group, base);

  if (favoured.length === 0 && weapon === undefined) {
    return undefined;
  }

  const attributes = favoured.length === 0 ? NEUTRAL_THEME : favouring(favoured);

  return weapon === undefined ? attributes : withWeapon(attributes, weapon);
}
