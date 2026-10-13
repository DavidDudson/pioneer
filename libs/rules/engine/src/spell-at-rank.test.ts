import { describe, expect, test } from 'bun:test';

import { SpellData, SpellRank } from '@pioneer/rules/sdk';

import { spellAtRank } from './spell-at-rank';

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

describe('spellAtRank', () => {
  test('a spell at its own rank is as written', () => {
    const cast = spellAtRank(spell(FIREBALL), SpellRank.parse(3));

    expect(cast.damage.map(({ formula }) => formula)).toEqual(['6d6']);
    expect(cast.area?.size).toBe(20);
  });

  test('interval heightening adds its dice once per whole step above the spell', () => {
    const cast = spellAtRank(spell(FIREBALL), SpellRank.parse(5));

    expect(cast.damage.map(({ formula }) => formula)).toEqual(['10d6']);
  });

  test('a wider interval counts whole steps only', () => {
    const wide = { ...FIREBALL, heightening: { ...FIREBALL.heightening, interval: 2 } };

    expect(spellAtRank(spell(wide), SpellRank.parse(4)).damage.map(({ formula }) => formula)).toEqual(['6d6']);
    expect(spellAtRank(spell(wide), SpellRank.parse(5)).damage.map(({ formula }) => formula)).toEqual(['8d6']);
  });

  test('a step that is not the base die is added as a term', () => {
    const mixed = { ...FIREBALL, heightening: { ...FIREBALL.heightening, damage: [{ key: '0', formula: '1d4' }] } };

    expect(spellAtRank(spell(mixed), SpellRank.parse(4)).damage.map(({ formula }) => formula)).toEqual(['6d6 + 1d4']);
  });

  test('a flat amount grows with the dice, and a trailing term stays last', () => {
    const flat = {
      ...FIREBALL,
      damage: [{ key: '0', formula: '1d4+1', damageType: 'force', kinds: ['damage'] }],
      heightening: { type: 'interval', interval: 2, damage: [{ key: '0', formula: '1d4+1' }] },
    };
    const attr = {
      ...FIREBALL,
      damage: [{ key: '0', formula: '2d6 + @spellcasting.attr', kinds: ['damage'] }],
    };

    expect(spellAtRank(spell(flat), SpellRank.parse(7)).damage.map(({ formula }) => formula)).toEqual(['3d4+3']);
    expect(spellAtRank(spell(attr), SpellRank.parse(4)).damage.map(({ formula }) => formula)).toEqual([
      '4d6 + @spellcasting.attr',
    ]);
  });

  test('interval heightening grows the area by feet per step', () => {
    const growing = { ...FIREBALL, heightening: { ...FIREBALL.heightening, area: 5 } };

    expect(spellAtRank(spell(growing), SpellRank.parse(5)).area?.size).toBe(30);
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

    const atFour = spellAtRank(spell(fixed), SpellRank.parse(4));
    const atFive = spellAtRank(spell(fixed), SpellRank.parse(5));

    expect(atFour.range).toEqual({ type: 'feet', feet: 60 });
    expect(atFour.targets).toBeUndefined();
    expect(atFive.range).toEqual({ type: 'feet', feet: 60 });
    expect(atFive.targets?.any[0]?.count).toBe(2);
  });

  test('a variant has the spell’s fields with its own laid over, heightened the same way', () => {
    const withVariant = {
      ...FIREBALL,
      variants: [{ name: 'Cold', damage: [{ key: '0', formula: '6d6', damageType: 'cold', kinds: ['damage'] }] }],
    };

    const [variant] = spellAtRank(spell(withVariant), SpellRank.parse(4)).variants;

    expect(variant?.name).toBe('Cold');
    expect(variant?.area?.size).toBe(20);
    expect(variant?.damage.map(({ formula, damageType }) => [formula, damageType])).toEqual([['8d6', 'cold']]);
  });
});
