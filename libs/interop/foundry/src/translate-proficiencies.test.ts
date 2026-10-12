import { describe, expect, test } from 'bun:test';

import { KindDataGapReason } from './kind-data-gaps';
import { FIGHTER } from './testing/build-fixtures';
import { ranksIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';

/** A passive feat of Foundry's `category` raising the ranks in `proficiencies`. */
function raising(name: string, proficiencies: unknown, category = 'classfeature'): DocumentFixture {
  return {
    id: name.replaceAll(' ', '').toLowerCase().padEnd(16, '0').slice(0, 16),
    name,
    type: 'feat',
    system: {
      category,
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      level: { value: 1 },
      subfeatures: { proficiencies },
    },
  };
}

/** The Fighter class alone, without the class features it grants. */
const FIGHTER_ALONE: DocumentFixture = { ...FIGHTER, system: { ...FIGHTER.system, items: {} } };

const ARMOR_EXPERTISE = raising('Armor Expertise', {
  heavy: { rank: 2 },
  light: { rank: 2 },
  medium: { rank: 2 },
  unarmored: { rank: 2 },
});

describe('translateKindData: subfeature proficiencies', () => {
  test("a class feature's armour ranks are Proficiency elements for each armour category", () => {
    const translation = translate([ARMOR_EXPERTISE]);

    expect(ranksIn(translation, 'armor-expertise')).toEqual([
      ['defense:heavy', 'expert'],
      ['defense:light', 'expert'],
      ['defense:medium', 'expert'],
      ['defense:unarmored', 'expert'],
    ]);
    expect(gapsOf(translation)).toEqual([]);
  });

  test.each([
    ['weapon categories', { unarmed: { rank: 2 }, simple: { rank: 3 } }, ['attack:unarmed', 'attack:simple']],
    ['more weapon categories', { martial: { rank: 2 }, advanced: { rank: 3 } }, ['attack:martial', 'attack:advanced']],
    [
      'saves',
      { fortitude: { rank: 2 }, reflex: { rank: 3 }, will: { rank: 4 } },
      ['save:fortitude', 'save:reflex', 'save:will'],
    ],
    ['perception', { perception: { rank: 3 } }, ['perception']],
    ['spellcasting', { spellcasting: { rank: 2 } }, ['spellcasting']],
  ])('%s raise their selectors', (_case, proficiencies, selectors) => {
    const translation = translate([raising('Expertise', proficiencies)]);

    expect(ranksIn(translation, 'expertise').map(([selector]) => selector)).toEqual(selectors);
    expect(gapsOf(translation)).toEqual([]);
  });

  test('Foundry rank numbers 1 to 4 are trained to legendary; 0 raises nothing', () => {
    const proficiencies = {
      unarmed: { rank: 0 },
      simple: { rank: 1 },
      martial: { rank: 2 },
      advanced: { rank: 3 },
      perception: { rank: 4 },
    };
    const translation = translate([raising('Ranks', proficiencies)]);

    expect(ranksIn(translation, 'ranks')).toEqual([
      ['attack:simple', 'trained'],
      ['attack:martial', 'expert'],
      ['attack:advanced', 'master'],
      ['perception', 'legendary'],
    ]);
    expect(gapsOf(translation)).toEqual([]);
  });

  test("a feat raises ranks as a class feature does (a dedication's armour)", () => {
    const translation = translate([raising('Light Dedication', { light: { rank: 1 } }, 'class')]);

    expect(ranksIn(translation, 'light-dedication')).toEqual([['defense:light', 'trained']]);
  });

  test("a class's slug is its class DC", () => {
    const translation = translate([
      FIGHTER_ALONE,
      raising('Fighter Expertise', { fighter: { attribute: FOUNDRY_NULL, rank: 2 } }),
    ]);

    expect(ranksIn(translation, 'fighter-expertise')).toEqual([['class-dc', 'expert']]);
    expect(gapsOf(translation)).toEqual([]);
  });

  test("a class DC's own attribute is reported, its rank kept", () => {
    const proficiencies = { fighter: { attribute: 'dex', rank: 1 }, light: { rank: 1 } };
    const translation = translate([FIGHTER_ALONE, raising('Fighter Dedication', proficiencies, 'class')]);

    expect(ranksIn(translation, 'fighter-dedication')).toEqual([
      ['class-dc', 'trained'],
      ['defense:light', 'trained'],
    ]);
    expect(gapsOf(translation)).toEqual([
      { reason: KindDataGapReason.UnmappedField, field: 'subfeatures.proficiencies.fighter.attribute', raw: 'dex' },
    ]);
  });

  test('a key naming no statistic or imported class stays in the backlog, the rest translated', () => {
    const translation = translate([raising('Odd', { psychic: { rank: 2 }, will: { rank: 2 } })]);

    expect(ranksIn(translation, 'odd')).toEqual([['save:will', 'expert']]);
    expect(gapsOf(translation)).toEqual([
      { reason: KindDataGapReason.UnmappedValue, field: 'subfeatures.proficiencies.psychic', raw: { rank: 2 } },
    ]);
  });

  test('proficiencies not shaped as ranks by key are reported whole', () => {
    const proficiencies = { will: { rank: 'expert' } };
    const translation = translate([raising('Malformed', proficiencies)]);

    expect(ranksIn(translation, 'malformed')).toEqual([]);
    expect(gapsOf(translation)).toEqual([
      { reason: KindDataGapReason.InvalidData, field: 'subfeatures.proficiencies', raw: proficiencies },
    ]);
  });
});
