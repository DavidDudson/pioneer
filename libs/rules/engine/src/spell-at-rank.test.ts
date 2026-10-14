import { describe, expect, test } from 'bun:test';

import { SpellData, SpellRank } from '@pioneer/rules/sdk';

import { spellAtRank } from './spell-at-rank';
import type { SpellAtRank, SpellCast } from './spell-at-rank';

const TIME = { type: 'actions', cost: 'two' };

function spell(fields: object): SpellData {
  return SpellData.parse({ rank: 1, time: TIME, traditions: ['arcane'], damage: [], ...fields });
}

const FIREBALL = {
  rank: 3,
  area: { shape: 'burst', size: 20 },
  damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
  heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '2d6' }] },
};

/** `data` cast at `rank`. */
function castAt(data: object, rank: number): SpellAtRank {
  return spellAtRank(spell(data), SpellRank.parse(rank));
}

/** The damage formulas of `data` cast at `rank`, as text. */
function formulasAt(data: object, rank: number): string[] {
  return castAt(data, rank).damage.map(({ formula }) => String(formula));
}

/** The size of `cast`'s area, if it has one. */
function sizeOf(cast: SpellCast): number | undefined {
  return cast.area === undefined ? undefined : Number(cast.area.size);
}

function feetOf(cast: SpellCast): number | undefined {
  return cast.range?.type === 'feet' ? Number(cast.range.feet) : undefined;
}

describe('spellAtRank', () => {
  test('a spell at its own rank is as written', () => {
    expect(formulasAt(FIREBALL, 3)).toEqual(['6d6']);
    expect(sizeOf(castAt(FIREBALL, 3))).toBe(20);
  });

  test('interval heightening adds its dice once per whole step above the spell', () => {
    expect(formulasAt(FIREBALL, 5)).toEqual(['10d6']);
  });

  test('a wider interval counts whole steps only', () => {
    const wide = { ...FIREBALL, heightening: { ...FIREBALL.heightening, interval: 2 } };

    expect(formulasAt(wide, 4)).toEqual(['6d6']);
    expect(formulasAt(wide, 5)).toEqual(['8d6']);
  });

  test('a step that is not the base die is added as a term', () => {
    const mixed = { ...FIREBALL, heightening: { ...FIREBALL.heightening, damage: [{ key: '0', formula: '1d4' }] } };

    expect(formulasAt(mixed, 4)).toEqual(['6d6 + 1d4']);
  });

  test('a flat amount grows with the dice, and a trailing term stays last', () => {
    const flat = {
      ...FIREBALL,
      damage: [{ key: '0', formula: '1d4+1', damageType: 'force', kinds: ['damage'] }],
      heightening: { type: 'interval', interval: 2, damage: [{ key: '0', formula: '1d4+1' }] },
    };
    const attr = { ...FIREBALL, damage: [{ key: '0', formula: '2d6 + @spellcasting.attr', kinds: ['damage'] }] };

    expect(formulasAt(flat, 7)).toEqual(['3d4+3']);
    expect(formulasAt(attr, 4)).toEqual(['4d6 + @spellcasting.attr']);
  });

  test('interval heightening grows the area by feet per step', () => {
    const growing = { ...FIREBALL, heightening: { ...FIREBALL.heightening, area: 5 } };

    expect(sizeOf(castAt(growing, 5))).toBe(30);
  });

  test('fixed heightening lays each rank reached over the spell, lowest first', () => {
    const fixed = {
      rank: 1,
      range: { type: 'feet', feet: 30 },
      heightening: {
        type: 'fixed',
        ranks: [
          { rank: 3, range: { type: 'feet', feet: 60 } },
          { rank: 5, targets: { any: [{ count: 2, of: 'creature' }] } },
        ],
      },
    };

    const atFour = castAt(fixed, 4);
    const atFive = castAt(fixed, 5);

    expect(feetOf(atFour)).toBe(60);
    expect(atFour.targets).toBeUndefined();
    expect(feetOf(atFive)).toBe(60);
    expect(Number(atFive.targets?.any[0]?.count)).toBe(2);
  });

  test('a variant has the spell’s fields with its own laid over, heightened the same way', () => {
    const withVariant = {
      ...FIREBALL,
      variants: [{ name: 'Cold', damage: [{ key: '0', formula: '6d6', damageType: 'cold', kinds: ['damage'] }] }],
    };

    const { variants } = castAt(withVariant, 4);

    expect(variants.map(({ name }) => String(name))).toEqual(['Cold']);
    expect(variants.map((variant) => sizeOf(variant))).toEqual([20]);
    expect(variants.flatMap(({ damage }) => damage.map((part) => `${part.formula} ${part.damageType}`))).toEqual([
      '8d6 cold',
    ]);
  });
});
