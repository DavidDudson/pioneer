import { favouring, NEUTRAL_THEME, withWeapon } from '@pioneer/character/domain';
import type { GenerationTheme } from '@pioneer/character/domain';
import type { Attribute, BaseWeapon, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';

/**
 * What the generate dialog's theme controls hold: the attributes to favour and the weapon, a category with a group,
 * a base or both.
 */
export interface GenerationThemeChoice {
  readonly favoured: readonly Attribute[];
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

/**
 * The theme `choice` asks for, or undefined when it asks for none, so the request carries no theme at all. A weapon
 * needs its category and a group or a base; with only a category, or a group or base without one, the weapon is left
 * out.
 */
export function themeOfChoice({ favoured, category, group, base }: GenerationThemeChoice): GenerationTheme | undefined {
  const weapon =
    category === undefined || (group === undefined && base === undefined)
      ? undefined
      : { category, ...(group === undefined ? {} : { group }), ...(base === undefined ? {} : { base }) };
  if (favoured.length === 0 && weapon === undefined) {
    return undefined;
  }
  const attributes = favoured.length === 0 ? NEUTRAL_THEME : favouring(favoured);
  return weapon === undefined ? attributes : withWeapon(attributes, weapon);
}
