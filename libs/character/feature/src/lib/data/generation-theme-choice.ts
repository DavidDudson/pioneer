import { favouring, NEUTRAL_THEME, withWeapon } from '@pioneer/character/domain';
import type { GenerationTheme } from '@pioneer/character/domain';
import type { Attribute, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';

/** What the generate dialog's theme controls hold: the attributes to favour and the weapon, a category and a group. */
export interface GenerationThemeChoice {
  readonly favoured: readonly Attribute[];
  readonly category: WeaponCategory | undefined;
  readonly group: WeaponGroup | undefined;
}

/** A choice that favours nothing and names no weapon. */
export const NO_THEME_CHOICE: GenerationThemeChoice = { favoured: [], category: undefined, group: undefined };

/**
 * The theme `choice` asks for, or undefined when it asks for none, so the request carries no theme at all. A weapon
 * needs both its category and its group; with only one the weapon is left out.
 */
export function themeOfChoice({ favoured, category, group }: GenerationThemeChoice): GenerationTheme | undefined {
  const weapon = category === undefined || group === undefined ? undefined : { category, group };
  if (favoured.length === 0 && weapon === undefined) {
    return undefined;
  }
  const attributes = favoured.length === 0 ? NEUTRAL_THEME : favouring(favoured);
  return weapon === undefined ? attributes : withWeapon(attributes, weapon);
}
