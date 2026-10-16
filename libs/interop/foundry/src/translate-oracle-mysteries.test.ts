import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { FIRST_REVELATION, ORACLE_DEDICATION } from './testing/archetype-focus-fixtures';
import { rulesIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { MYSTERY_FLAMES } from './testing/spellcasting-fixtures';
import { MYSTERIES } from './translate-oracle-mysteries';

const { ChoiceSet, FocusSpells, SpellcastingEntry } = RuleElementKey;

const ORACLE_ENTRY = {
  key: SpellcastingEntry,
  slug: 'oracle-focus',
  tradition: 'divine',
  attribute: 'cha',
  preparation: 'focus',
};
const spell = (slug: string): string => idOf(`spell:${slug}`);

function keyed(key: string, name: string, fixture: DocumentFixture): Record<string, unknown>[] {
  return rulesIn(translate([fixture]), name).filter(
    (rule): rule is Record<string, unknown> =>
      typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === key,
  );
}

describe('translateKindData: oracle revelation spells', () => {
  test('a mystery gives the divine charisma focus entry and its initial, advanced and greater spells', () => {
    expect(
      keyed(SpellcastingEntry, 'flames', MYSTERY_FLAMES).filter(({ preparation }) => preparation === 'focus'),
    ).toEqual([ORACLE_ENTRY]);
    expect(keyed(FocusSpells, 'flames', MYSTERY_FLAMES)).toEqual([
      { key: FocusSpells, entry: 'oracle-focus', spells: [spell('incendiary-aura')] },
      {
        key: FocusSpells,
        entry: 'oracle-focus',
        spells: [spell('whirling-flames')],
        predicate: ['feat:advanced-revelation'],
      },
      {
        key: FocusSpells,
        entry: 'oracle-focus',
        spells: [spell('flaming-fusillade')],
        predicate: ['feat:greater-revelation'],
      },
    ]);
  });

  test('every mystery is named once, with three distinct spells', () => {
    const spells = MYSTERIES.flatMap((mystery) => mystery.slice(2));

    expect(new Set(MYSTERIES.map(([slug]) => slug)).size).toBe(MYSTERIES.length);
    expect(new Set(spells).size).toBe(MYSTERIES.length * 3);
  });

  test('Oracle Dedication picks a mystery and grants no spell', () => {
    const [choice] = keyed(ChoiceSet, 'oracle-dedication', ORACLE_DEDICATION);

    expect(choice).toMatchObject({ flag: 'mystery', rollOption: 'feat:oracle-dedication' });
    expect(choice?.['choices']).toContainEqual({ value: 'tempest', label: 'Tempest' });
    expect(keyed(FocusSpells, 'oracle-dedication', ORACLE_DEDICATION)).toEqual([]);
  });

  test("First Revelation gives the initial spell of the dedication's mystery", () => {
    expect(keyed(SpellcastingEntry, 'first-revelation', FIRST_REVELATION)).toEqual([ORACLE_ENTRY]);
    expect(keyed(FocusSpells, 'first-revelation', FIRST_REVELATION)).toContainEqual({
      key: FocusSpells,
      entry: 'oracle-focus',
      spells: [spell('weapon-trance')],
      predicate: ['feat:oracle-dedication:battle'],
    });
    expect(keyed(FocusSpells, 'first-revelation', FIRST_REVELATION)).toHaveLength(MYSTERIES.length);
  });
});
