import { FAVOURED, UNTHEMED } from '@pioneer/character/domain';
import { Attribute, BaseWeapon, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { NO_THEME_CHOICE, themeOfChoice } from './generation-theme-choice';

describe(themeOfChoice, () => {
  it('asks for no theme when nothing is chosen', () => {
    expect(themeOfChoice(NO_THEME_CHOICE)).toBeUndefined();
  });

  it('favours the chosen attributes and leaves the rest at the least weight', () => {
    const theme = themeOfChoice({ ...NO_THEME_CHOICE, favoured: [Attribute.Strength] });

    expect(theme?.attributes[Attribute.Strength]).toBe(FAVOURED);
    expect(theme?.attributes[Attribute.Wisdom]).toBe(UNTHEMED);
    expect(theme?.weapon).toBeUndefined();
  });

  it('names the weapon when both its category and group are chosen', () => {
    const theme = themeOfChoice({ ...NO_THEME_CHOICE, category: WeaponCategory.Martial, group: WeaponGroup.Sword });

    expect(theme?.weapon).toStrictEqual({ category: WeaponCategory.Martial, group: WeaponGroup.Sword });
  });

  it('names the weapon by its base, with or without a group', () => {
    const base = BaseWeapon.parse('longsword');

    expect(themeOfChoice({ ...NO_THEME_CHOICE, category: WeaponCategory.Martial, base })?.weapon).toStrictEqual({
      category: WeaponCategory.Martial,
      base,
    });
    expect(
      themeOfChoice({ ...NO_THEME_CHOICE, category: WeaponCategory.Martial, group: WeaponGroup.Sword, base })?.weapon,
    ).toStrictEqual({ category: WeaponCategory.Martial, group: WeaponGroup.Sword, base });
  });

  it('leaves the weapon out while its category or its group and base are missing', () => {
    const base = BaseWeapon.parse('longsword');

    expect(themeOfChoice({ ...NO_THEME_CHOICE, category: WeaponCategory.Martial })).toBeUndefined();
    expect(themeOfChoice({ ...NO_THEME_CHOICE, group: WeaponGroup.Sword })).toBeUndefined();
    expect(themeOfChoice({ ...NO_THEME_CHOICE, base })).toBeUndefined();
  });
});
