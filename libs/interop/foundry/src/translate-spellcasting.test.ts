import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { rulesIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { gapsOf } from './testing/kind-fixtures';
import {
  CLERIC_SPELLCASTING,
  EXPERT_WIZARD_SPELLCASTING,
  FIGHTER_FEATURE,
  THE_RESENTMENT,
  WITCH_DEDICATION,
  WIZARD_DEDICATION,
  WIZARD_SPELLCASTING,
} from './testing/spellcasting-fixtures';

const { SpellcastingEntry: Entry, Proficiency } = RuleElementKey;

/** Holds for a cleric of `doctrine` from `level` on. */
function from(doctrine: string, level: number): object {
  return { and: [`feature:${doctrine}`, { gte: ['self:level', level] }] };
}

describe('translateKindData: spellcasting entries', () => {
  test("a caster's spellcasting feature gives its entry, raised by the Spellcaster features", () => {
    const wizard = translate([WIZARD_SPELLCASTING]);

    expect(rulesIn(wizard, 'wizard-spellcasting')).toEqual([
      { key: Entry, slug: 'wizard', tradition: 'arcane', attribute: 'int', preparation: 'prepared' },
      { key: Proficiency, selector: 'spellcasting:arcane', rank: 'expert', predicate: ['feature:expert-spellcaster'] },
      { key: Proficiency, selector: 'spellcasting:arcane', rank: 'master', predicate: ['feature:master-spellcaster'] },
      {
        key: Proficiency,
        selector: 'spellcasting:arcane',
        rank: 'legendary',
        predicate: ['feature:legendary-spellcaster'],
      },
    ]);
  });

  test("a cleric's entry rises with its doctrine and level", () => {
    const [cleric, ...raises] = rulesIn(translate([CLERIC_SPELLCASTING]), 'cleric-spellcasting');

    expect(cleric).toEqual({
      key: Entry,
      slug: 'cleric',
      tradition: 'divine',
      attribute: 'wis',
      preparation: 'prepared',
    });
    expect(raises).toEqual([
      {
        key: Proficiency,
        selector: 'spellcasting:divine',
        rank: 'expert',
        predicate: [{ or: [from('cloistered-cleric', 7), from('warpriest', 11)] }],
      },
      {
        key: Proficiency,
        selector: 'spellcasting:divine',
        rank: 'master',
        predicate: [{ or: [from('cloistered-cleric', 15), from('warpriest', 19)] }],
      },
      {
        key: Proficiency,
        selector: 'spellcasting:divine',
        rank: 'legendary',
        predicate: [from('cloistered-cleric', 19)],
      },
    ]);
  });

  test("a witch's patron gives the witch entry in the patron's tradition", () => {
    const [witch] = rulesIn(translate([THE_RESENTMENT]), 'the-resentment');

    expect(witch).toEqual({
      key: Entry,
      slug: 'witch',
      tradition: 'occult',
      attribute: 'int',
      preparation: 'prepared',
    });
  });

  test("a multiclass dedication casts like its class, and the archetype's Expert Spellcasting feat raises it", () => {
    const multiclass = translate([WIZARD_DEDICATION, EXPERT_WIZARD_SPELLCASTING]);

    expect(rulesIn(multiclass, 'wizard-dedication')).toEqual([
      { key: Entry, slug: 'wizard', tradition: 'arcane', attribute: 'int', preparation: 'prepared' },
    ]);
    expect(rulesIn(multiclass, 'expert-wizard-spellcasting')).toEqual([
      { key: Proficiency, selector: 'spellcasting:arcane', rank: 'expert' },
    ]);
  });

  test("a witch dedication's tradition is its patron's, which Foundry leaves to the player: reported, no entry", () => {
    const witch = translate([WITCH_DEDICATION]);

    expect(rulesIn(witch, 'witch-dedication')).toEqual([]);
    expect(gapsOf(witch)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'spellcasting',
      raw: 'feat:witch-dedication',
    });
  });

  test('a feature that casts nothing gains nothing', () => {
    expect(rulesIn(translate([FIGHTER_FEATURE]), 'reactive-strike')).toEqual([]);
  });
});
