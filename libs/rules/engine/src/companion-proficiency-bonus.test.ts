import { describe, expect, test } from 'bun:test';

import { Level, Modifier, Proficiency, ProficiencyBonusTable } from '@pioneer/rules/sdk';

import { companionProficiencyBonus } from './companion-statistics';

/** Player Core's table, as the core rules pack carries it. */
const TABLE = ProficiencyBonusTable.parse({
  untrained: '0',
  trained: '2 + @level',
  expert: '4 + @level',
  master: '6 + @level',
  legendary: '8 + @level',
});

describe('companionProficiencyBonus', () => {
  test('reads each rank from the table at the level', () => {
    const bonus = companionProficiencyBonus(TABLE, Level.parse(5));

    expect(bonus(Proficiency.Untrained)).toBe(Modifier.parse(0));
    expect(bonus(Proficiency.Trained)).toBe(Modifier.parse(7));
    expect(bonus(Proficiency.Expert)).toBe(Modifier.parse(9));
    expect(bonus(Proficiency.Legendary)).toBe(Modifier.parse(13));
  });

  test('follows a table that ignores the level', () => {
    const flat = ProficiencyBonusTable.parse({ ...TABLE, trained: '2', expert: '4' });
    const bonus = companionProficiencyBonus(flat, Level.parse(10));

    expect(bonus(Proficiency.Trained)).toBe(Modifier.parse(2));
    expect(bonus(Proficiency.Expert)).toBe(Modifier.parse(4));
  });
});
