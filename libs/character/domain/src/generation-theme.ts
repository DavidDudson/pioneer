import { Attribute, BaseWeapon, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { PickWeight } from './picks';

/** How much more likely a pick is for the attribute it raises or uses: 1 is the least, so no pick is ever ruled out. */
const THEME_WEIGHT_MAX = 100;
export const ThemeWeight = z.int().min(1).max(THEME_WEIGHT_MAX).brand<'ThemeWeight'>();
export type ThemeWeight = z.infer<typeof ThemeWeight>;

/**
 * The weapon a theme names: a weapon group, a base weapon or both, and the lowest category of the weapons it covers,
 * so a class that trains that category counts as training it. The group and base are what content names weapons by
 * (`group:sword`, `base:longsword`).
 */
export const WeaponThemeSchema = z
  .strictObject({
    category: z.enum(WeaponCategory),
    group: z.enum(WeaponGroup).optional(),
    base: BaseWeapon.optional(),
  })
  .refine(({ group, base }) => group !== undefined || base !== undefined, { message: 'names no weapon group or base' });
export type WeaponTheme = z.infer<typeof WeaponThemeSchema>;

/**
 * A generation theme: a weight for each attribute, and optionally a weapon. Boosts, a class by its key attribute and
 * feats by the attributes their prerequisites name are picked in proportion to the weight of the attribute they raise
 * or use; a pick that raises or uses none weighs the least. With a weapon, classes, ancestries and feats that train
 * or name it weigh more again, and the gear step equips it. Every weight is at least 1, so a theme only shifts the odds and never makes a
 * legal pick impossible.
 */
export const GenerationThemeSchema = z.strictObject({
  attributes: z.strictObject({
    [Attribute.Strength]: ThemeWeight,
    [Attribute.Dexterity]: ThemeWeight,
    [Attribute.Constitution]: ThemeWeight,
    [Attribute.Intelligence]: ThemeWeight,
    [Attribute.Wisdom]: ThemeWeight,
    [Attribute.Charisma]: ThemeWeight,
  }),
  weapon: WeaponThemeSchema.optional(),
});
export type GenerationTheme = z.infer<typeof GenerationThemeSchema>;

/** The weight of a pick that raises or uses no attribute, and of every attribute in a neutral theme. */
export const UNTHEMED = ThemeWeight.parse(1);

/** How much likelier a favoured attribute is than the rest in `favouring`. */
export const FAVOURED = ThemeWeight.parse(6);

const ATTRIBUTES: readonly Attribute[] = Object.values(Attribute);

/** A theme that favours no attribute. */
export const NEUTRAL_THEME: GenerationTheme = favouring([]);

/** A theme that weighs each of `favoured` at `FAVOURED` and every other attribute at 1. */
export function favouring(favoured: readonly Attribute[]): GenerationTheme {
  const weights = ATTRIBUTES.map((attribute): [Attribute, ThemeWeight] => [
    attribute,
    favoured.includes(attribute) ? FAVOURED : UNTHEMED,
  ]);
  return GenerationThemeSchema.parse({ attributes: Object.fromEntries(weights) });
}

/** How likely a pick that raises or uses `attributes` is: the heaviest of them, or the least when it has none. */
export function themeWeight(theme: GenerationTheme, attributes: readonly Attribute[]): PickWeight {
  return PickWeight.parse(Math.max(UNTHEMED, ...attributes.map((attribute) => theme.attributes[attribute])));
}

/** `theme` with the weapon it names; its attribute weights stay, so the two compose. */
export function withWeapon(theme: GenerationTheme, weapon: WeaponTheme): GenerationTheme {
  return GenerationThemeSchema.parse({ ...theme, weapon });
}

/** How likely a pick that trains the themed weapon's category is; one that names its group or base weighs `FAVOURED`. */
export const TRAINS_WEAPON = ThemeWeight.parse(3);

/** Two weights combined, held to the most a weight can be: a pick favoured twice over comes up more than either alone. */
export function composeWeights(first: PickWeight, second: ThemeWeight): PickWeight {
  return PickWeight.parse(Math.min(first * second, THEME_WEIGHT_MAX));
}
