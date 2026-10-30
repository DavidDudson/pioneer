import { itemFixtureContent } from '@pioneer/character/domain/testing';
import { BaseWeapon, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { weaponBases } from './weapon-bases';

describe(weaponBases, () => {
  const bases = weaponBases(itemFixtureContent());

  it('lists a base once, with the category and group its weapons share', () => {
    const longswords = bases.filter(({ base }) => base === BaseWeapon.parse('longsword'));

    expect(longswords).toHaveLength(1);
    expect(longswords[0]).toMatchObject({ category: WeaponCategory.Martial, group: WeaponGroup.Sword });
  });

  it('is sorted by name and holds weapons only', () => {
    const names = bases.map(({ name }) => name);

    expect(names).toStrictEqual(names.toSorted((left, right) => left.localeCompare(right)));
    expect(names).not.toContain('Backpack');
  });
});
