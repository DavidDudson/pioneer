import { describe, expect, test } from 'bun:test';

import { Hardness, HitPoints, ReinforcingGrade } from '@pioneer/rules/sdk';

import { reinforced } from './reinforcing-rune';

const BASE = { hardness: Hardness.parse(5), hitPoints: HitPoints.parse(20) };

/** Grade by grade: Hardness and Hit Points added, or the rune's maximum when that is lower (GM Core). */
const GRADES = [
  { grade: 1, hardness: 8, hitPoints: 64 },
  { grade: 2, hardness: 8, hitPoints: 72 },
  { grade: 3, hardness: 8, hitPoints: 84 },
  { grade: 4, hardness: 10, hitPoints: 100 },
  { grade: 5, hardness: 10, hitPoints: 104 },
  { grade: 6, hardness: 12, hitPoints: 128 },
] as const;

describe('reinforced', () => {
  test('a shield with no reinforcing rune keeps its figures', () => {
    expect(reinforced(BASE, undefined)).toStrictEqual(BASE);
  });

  test.each(GRADES)('a grade $grade rune adds its increase to Hardness 5 and 20 Hit Points', (row) => {
    expect(reinforced(BASE, ReinforcingGrade.parse(row.grade))).toStrictEqual({
      hardness: Hardness.parse(row.hardness),
      hitPoints: HitPoints.parse(row.hitPoints),
    });
  });

  test('stops at the rune’s maximum', () => {
    const sturdy = { hardness: Hardness.parse(7), hitPoints: HitPoints.parse(60) };
    expect(reinforced(sturdy, ReinforcingGrade.parse(1))).toStrictEqual({
      hardness: Hardness.parse(8),
      hitPoints: HitPoints.parse(64),
    });
  });

  test('never takes a shield already past the maximum below its own figures', () => {
    const tough = { hardness: Hardness.parse(12), hitPoints: HitPoints.parse(90) };
    expect(reinforced(tough, ReinforcingGrade.parse(1))).toStrictEqual(tough);
  });
});
