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
import type { ImportTranslation } from './translate-import';

const { SpellcastingEntry: Entry, Proficiency, SpellSlots, ChoiceSet, FocusSpells } = RuleElementKey;
const ELSEWHERE: ReadonlySet<string> = new Set([SpellSlots, ChoiceSet, FocusSpells]);

/** The rules an entry gains, less its spell slots and focus spells (`translate-spell-slots.test.ts`, `translate-focus-spells.test.ts`). */
function castingRules(translation: ImportTranslation, name: string): unknown[] {
  return rulesIn(translation, name).filter(
    (rule) => !(typeof rule === 'object' && rule !== null && 'key' in rule && ELSEWHERE.has(String(rule.key))),
  );
}

/** Holds for a cleric of `doctrine` from `level` on. */
function from(doctrine: string, level: number): object {
  return { and: [`feature:${doctrine}`, { gte: ['self:level', level] }] };
}

describe('translateKindData: spellcasting entries', () => {
  test("a caster's spellcasting feature gives its entry, raised by the Spellcaster features", () => {
    const wizard = translate([WIZARD_SPELLCASTING]);

    expect(castingRules(wizard, 'wizard-spellcasting')).toEqual([
      { key: Entry, slug: 'wizard', tradition: 'arcane', attribute: 'int', preparation: 'prepared' },
      { key: Proficiency, selector: 'spellcasting', rank: 'expert', predicate: ['feature:expert-spellcaster'] },
      { key: Proficiency, selector: 'spellcasting', rank: 'master', predicate: ['feature:master-spellcaster'] },
      {
        key: Proficiency,
        selector: 'spellcasting',
        rank: 'legendary',
        predicate: ['feature:legendary-spellcaster'],
      },
    ]);
  });

  test("a cleric's entry rises with its doctrine and level", () => {
    const [cleric, ...raises] = castingRules(translate([CLERIC_SPELLCASTING]), 'cleric-spellcasting');

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
        selector: 'spellcasting',
        rank: 'expert',
        predicate: [{ or: [from('cloistered-cleric', 7), from('warpriest', 11)] }],
      },
      {
        key: Proficiency,
        selector: 'spellcasting',
        rank: 'master',
        predicate: [{ or: [from('cloistered-cleric', 15), from('warpriest', 19)] }],
      },
      {
        key: Proficiency,
        selector: 'spellcasting',
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

    expect(castingRules(multiclass, 'wizard-dedication')).toEqual([
      { key: Entry, slug: 'wizard', tradition: 'arcane', attribute: 'int', preparation: 'prepared' },
    ]);
    expect(castingRules(multiclass, 'expert-wizard-spellcasting')).toEqual([
      { key: Proficiency, selector: 'spellcasting', rank: 'expert' },
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

  test('a caster feature whose data is invalid gains no spellcasting rules', () => {
    const broken = translate([
      { ...WIZARD_SPELLCASTING, system: { ...WIZARD_SPELLCASTING.system, category: 'nonsense' } },
    ]);
    const dedication = translate([
      { ...WIZARD_DEDICATION, system: { ...WIZARD_DEDICATION.system, category: 'nonsense' } },
    ]);

    expect(rulesIn(broken, 'wizard-spellcasting')).toEqual([]);
    expect(rulesIn(dedication, 'wizard-dedication')).toEqual([]);
  });

  test('a feature that casts nothing gains nothing', () => {
    expect(rulesIn(translate([FIGHTER_FEATURE]), 'reactive-strike')).toEqual([]);
  });
});
