import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { rulesIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import {
  BASIC_SORCERER_SPELLCASTING,
  BASIC_WIZARD_SPELLCASTING,
  DIVINE_FONT,
  EXPERT_WIZARD_SPELLCASTING,
  MASTER_WIZARD_SPELLCASTING,
  SCHOOL_OF_BATTLE_MAGIC,
  SCHOOL_OF_UNIFIED_MAGICAL_THEORY,
  SORCERER_DEDICATION,
  WITCH_SPELLCASTING,
  WIZARD_DEDICATION,
  WIZARD_SPELLCASTING,
} from './testing/spellcasting-fixtures';
import type { Fields } from './translate-choice-reads';

const { SpellSlots } = RuleElementKey;

/** Holds from `level` on. */
function from(level: number): Fields {
  return { predicate: [{ gte: ['self:level', level] }] };
}

function slotsIn(name: string, fixture: DocumentFixture): Array<unknown> {
  return rulesIn(translate([fixture]), name).filter(
    (rule) => typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === SpellSlots,
  );
}

describe('translateKindData: spell slots', () => {
  test("a caster's spellcasting feature gives Player Core's spells per day: five cantrips, 2 then 3 per rank", () => {
    const wizard = slotsIn('wizard-spellcasting', WIZARD_SPELLCASTING);

    expect(wizard.slice(0, 5)).toEqual([
      { key: SpellSlots, entry: 'wizard', rank: 'cantrip', value: 5 },
      { key: SpellSlots, entry: 'wizard', rank: 1, value: 2 },
      { key: SpellSlots, entry: 'wizard', rank: 1, value: 1, ...from(2) },
      { key: SpellSlots, entry: 'wizard', rank: 2, value: 2, ...from(3) },
      { key: SpellSlots, entry: 'wizard', rank: 2, value: 1, ...from(4) },
    ]);
    expect(wizard.slice(-3)).toEqual([
      { key: SpellSlots, entry: 'wizard', rank: 9, value: 2, ...from(17) },
      { key: SpellSlots, entry: 'wizard', rank: 9, value: 1, ...from(18) },
      { key: SpellSlots, entry: 'wizard', rank: 10, value: 1, ...from(19) },
    ]);
  });

  test("a witch's slots are on Witch Spellcasting, for the entry the patron gives", () => {
    expect(slotsIn('witch-spellcasting', WITCH_SPELLCASTING)).toContainEqual({
      key: SpellSlots,
      entry: 'witch',
      rank: 'cantrip',
      value: 5,
    });
  });

  test('divine font is a pool at the highest rank: four slots, five from 5th level, six from 15th', () => {
    const font = { key: SpellSlots, entry: 'cleric', rank: 'highest', pool: 'divine-font' };

    expect(slotsIn('divine-font', DIVINE_FONT)).toEqual([
      { ...font, value: 4 },
      { ...font, value: 1, ...from(5) },
      { ...font, value: 1, ...from(15) },
    ]);
  });

  test('a curriculum school adds a cantrip and a slot of each rank to 9th, as each opens; Unified Magical Theory none', () => {
    const curriculum = slotsIn('school-of-battle-magic', SCHOOL_OF_BATTLE_MAGIC);
    const slot = { key: SpellSlots, entry: 'wizard', value: 1, pool: 'curriculum' };

    expect(curriculum).toHaveLength(10);
    expect(curriculum.slice(0, 3)).toEqual([
      { ...slot, rank: 'cantrip' },
      { ...slot, rank: 1 },
      { ...slot, rank: 2, ...from(3) },
    ]);
    expect(curriculum.at(-1)).toEqual({ ...slot, rank: 9, ...from(17) });
    expect(slotsIn('school-of-unified-magical-theory', SCHOOL_OF_UNIFIED_MAGICAL_THEORY)).toEqual([]);
  });

  test("a multiclass caster's dedication gives two cantrips, its spellcasting feats a slot of each rank in turn", () => {
    const slot = { key: SpellSlots, entry: 'wizard', value: 1 };

    expect(slotsIn('wizard-dedication', WIZARD_DEDICATION)).toEqual([
      { key: SpellSlots, entry: 'wizard', rank: 'cantrip', value: 2 },
    ]);
    expect(slotsIn('basic-wizard-spellcasting', BASIC_WIZARD_SPELLCASTING)).toEqual([
      { ...slot, rank: 1, ...from(4) },
      { ...slot, rank: 2, ...from(6) },
      { ...slot, rank: 3, ...from(8) },
    ]);
    expect(slotsIn('expert-wizard-spellcasting', EXPERT_WIZARD_SPELLCASTING)).toEqual([
      { ...slot, rank: 4, ...from(12) },
      { ...slot, rank: 5, ...from(14) },
      { ...slot, rank: 6, ...from(16) },
    ]);
    expect(slotsIn('master-wizard-spellcasting', MASTER_WIZARD_SPELLCASTING)).toEqual([
      { ...slot, rank: 7, ...from(18) },
      { ...slot, rank: 8, ...from(20) },
    ]);
  });

  test("a sorcerer dedication's cantrips and Basic Sorcerer Spellcasting's slots go on the entry its bloodline gives", () => {
    expect(slotsIn('sorcerer-dedication', SORCERER_DEDICATION)).toEqual([
      { key: SpellSlots, entry: 'sorcerer', rank: 'cantrip', value: 2 },
    ]);
    expect(slotsIn('basic-sorcerer-spellcasting', BASIC_SORCERER_SPELLCASTING)).toEqual([
      { key: SpellSlots, entry: 'sorcerer', rank: 1, value: 1, ...from(4) },
      { key: SpellSlots, entry: 'sorcerer', rank: 2, value: 1, ...from(6) },
      { key: SpellSlots, entry: 'sorcerer', rank: 3, value: 1, ...from(8) },
    ]);
  });
});
