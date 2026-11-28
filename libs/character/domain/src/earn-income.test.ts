import { describe, expect, test } from 'bun:test';

import { Coin, COPPER_PER_COIN, CopperValue, Dc, DegreeOfSuccess, Proficiency } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';

import type { Character } from './character';
import { CharacterPatchField, CharacterPatchSchema } from './character-patch';
import { CoinChangeSchema, LedgerReason } from './coin-ledger';
import { CORE_EARN_INCOME, earnIncomeDc, incomePerDay } from './earn-income';
import { EarnDays, TASK_LEVEL_MAX, TaskLevel } from './earn-income-fields';
import type { EarnRank } from './earn-income-fields';
import { CoinsSchema } from './inventory';
import { CharacterBuilder } from './testing';

installRulesFakes();

const now = fixedClock('2026-10-07T10:00:00Z').now();
const level = (value: number): TaskLevel => TaskLevel.parse(value);
const copper = (value: number): CopperValue => CopperValue.parse(value);
const gold = (count: number): CopperValue => copper(count * COPPER_PER_COIN[Coin.Gold]);
const silver = (count: number): CopperValue => copper(count * COPPER_PER_COIN[Coin.Silver]);

/** Orders numbers from the smallest. */
function ascending(left: number, right: number): number {
  return left - right;
}

describe('earn income table', () => {
  test('has a row for every task level, with the DCs of the core table', () => {
    expect(CORE_EARN_INCOME.levels).toHaveLength(TASK_LEVEL_MAX + 1);
    expect(earnIncomeDc(CORE_EARN_INCOME, level(0))).toBe(Dc.parse(14));
    expect(earnIncomeDc(CORE_EARN_INCOME, level(6))).toBe(Dc.parse(22));
    expect(earnIncomeDc(CORE_EARN_INCOME, level(20))).toBe(Dc.parse(40));
  });

  test('never pays less at a higher level or a higher rank', () => {
    for (const row of CORE_EARN_INCOME.levels) {
      expect(row.trained).toBeLessThanOrEqual(row.expert);
      expect(row.expert).toBeLessThanOrEqual(row.master);
      expect(row.master).toBeLessThanOrEqual(row.legendary);
    }

    const trained = CORE_EARN_INCOME.levels.map((row) => row.trained);
    expect(trained.toSorted(ascending)).toEqual(trained);
  });
});

function check(taskLevel: number, rank: EarnRank, degree: DegreeOfSuccess): CopperValue {
  return incomePerDay(CORE_EARN_INCOME, { level: level(taskLevel), rank, degree });
}

describe('income per day', () => {
  test('a success pays the rank at the task level', () => {
    expect(check(3, Proficiency.Trained, DegreeOfSuccess.Success)).toBe(silver(5));
    expect(check(10, Proficiency.Master, DegreeOfSuccess.Success)).toBe(gold(6));
  });

  test('a critical success pays the next level up', () => {
    expect(check(3, Proficiency.Trained, DegreeOfSuccess.CriticalSuccess)).toBe(silver(7));
    expect(check(0, Proficiency.Trained, DegreeOfSuccess.CriticalSuccess)).toBe(silver(2));
  });

  test('a critical success at the top level pays the table’s critical row', () => {
    expect(check(20, Proficiency.Legendary, DegreeOfSuccess.CriticalSuccess)).toBe(gold(300));
    expect(check(20, Proficiency.Trained, DegreeOfSuccess.CriticalSuccess)).toBe(gold(50));
  });

  test('a failure pays the failed column whatever the rank', () => {
    expect(check(5, Proficiency.Trained, DegreeOfSuccess.Failure)).toBe(silver(2));
    expect(check(5, Proficiency.Legendary, DegreeOfSuccess.Failure)).toBe(silver(2));
  });

  test('a critical failure pays nothing', () => {
    expect(check(5, Proficiency.Master, DegreeOfSuccess.CriticalFailure)).toBe(copper(0));
  });
});

function earn(degree: DegreeOfSuccess, days: number): Character {
  return new CharacterBuilder()
    .build()
    .apply({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ cp: 7 }) }, now)
    .apply(
      {
        field: CharacterPatchField.EarnIncome,
        level: level(3),
        rank: Proficiency.Trained,
        degree,
        days: EarnDays.parse(days),
      },
      now,
    );
}

describe('earning income as an edit', () => {
  test('pays each day the same into the purse, keeping the coins already there', () => {
    const { coins } = earn(DegreeOfSuccess.Success, 4).document.inventory;

    expect(coins).toEqual(CoinsSchema.parse({ gp: 2, cp: 7 }));
  });

  test('logs the days as one income entry', () => {
    const [entry] = earn(DegreeOfSuccess.Success, 4).document.inventory.ledger.slice(-1);

    expect(entry?.reason).toBe(LedgerReason.Income);
    expect(entry?.change).toEqual(CoinChangeSchema.parse({ gp: 2 }));
  });

  test('a critical failure changes no coins and logs nothing', () => {
    const character = earn(DegreeOfSuccess.CriticalFailure, 3);

    expect(character.document.inventory.coins).toEqual(CoinsSchema.parse({ cp: 7 }));
    expect(character.document.inventory.ledger.some((entry) => entry.reason === LedgerReason.Income)).toBe(false);
  });
});

/** One row of Player Core Table 4-2 as the book prints it: the DC, then the failed column and each rank's. */
type PrintedRow = readonly [dc: number, failed: CopperValue, ...ranks: ReadonlyArray<CopperValue>];

const cp = copper;

const PRINTED: ReadonlyArray<PrintedRow> = [
  [14, cp(1), cp(5), cp(5), cp(5), cp(5)],
  [15, cp(2), silver(2), silver(2), silver(2), silver(2)],
  [16, cp(4), silver(3), silver(3), silver(3), silver(3)],
  [18, cp(8), silver(5), silver(5), silver(5), silver(5)],
  [19, silver(1), silver(7), silver(8), silver(8), silver(8)],
  [20, silver(2), silver(9), gold(1), gold(1), gold(1)],
  [22, silver(3), silver(15), gold(2), gold(2), gold(2)],
  [23, silver(4), gold(2), silver(25), silver(25), silver(25)],
  [24, silver(5), silver(25), gold(3), gold(3), gold(3)],
  [26, silver(6), gold(3), gold(4), gold(4), gold(4)],
  [27, silver(7), gold(4), gold(5), gold(6), gold(6)],
  [28, silver(8), gold(5), gold(6), gold(8), gold(8)],
  [30, silver(9), gold(6), gold(8), gold(10), gold(10)],
  [31, gold(1), gold(7), gold(10), gold(15), gold(15)],
  [32, silver(15), gold(8), gold(15), gold(20), gold(20)],
  [34, gold(2), gold(10), gold(20), gold(28), gold(28)],
  [35, silver(25), gold(13), gold(25), gold(36), gold(40)],
  [36, gold(3), gold(15), gold(30), gold(45), gold(55)],
  [38, gold(4), gold(20), gold(45), gold(70), gold(90)],
  [39, gold(6), gold(30), gold(60), gold(100), gold(130)],
  [40, gold(8), gold(40), gold(75), gold(150), gold(200)],
];

describe('earn income table against the printed one', () => {
  test.each(PRINTED.map((row, taskLevel) => ({ taskLevel, row })))('task level $taskLevel', ({ taskLevel, row }) => {
    const [dc, failed, trained, expert, master, legendary] = row;
    const stored = CORE_EARN_INCOME.levels[taskLevel];

    expect(stored).toMatchObject({ dc, failed, trained, expert, master, legendary });
  });

  test('a critical success at level 19 pays the level 20 column', () => {
    expect(check(19, Proficiency.Master, DegreeOfSuccess.CriticalSuccess)).toBe(gold(150));
  });
});

interface PatchInput {
  readonly field: typeof CharacterPatchField.EarnIncome;
  readonly level: number;
  readonly rank: string;
  readonly degree: string;
  readonly days: number;
}

const VALID_PATCH: PatchInput = {
  field: CharacterPatchField.EarnIncome,
  level: 3,
  rank: Proficiency.Trained,
  degree: DegreeOfSuccess.Success,
  days: 1,
};

function patch(overrides: Partial<PatchInput>): PatchInput {
  return { ...VALID_PATCH, ...overrides };
}

describe('earn income patch', () => {
  test.each([{ days: 1 }, { days: 365 }, { level: 0 }, { level: 20 }, { rank: Proficiency.Legendary }])(
    'takes %o',
    (overrides) => {
      expect(CharacterPatchSchema.safeParse(patch(overrides)).success).toBe(true);
    },
  );

  test.each([
    { days: 0 },
    { days: 366 },
    { days: 1.5 },
    { level: -1 },
    { level: 21 },
    { rank: Proficiency.Untrained },
    { degree: 'nope' },
  ])('refuses %o', (overrides) => {
    expect(CharacterPatchSchema.safeParse(patch(overrides)).success).toBe(false);
  });
});

describe('earning income into a mixed purse', () => {
  test('adds each coin to the one already held, and the most days at the top pay out whole', () => {
    const character = new CharacterBuilder()
      .build()
      .apply({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ pp: 1, gp: 3, sp: 4, cp: 5 }) }, now)
      .apply(
        {
          field: CharacterPatchField.EarnIncome,
          level: level(20),
          rank: Proficiency.Legendary,
          degree: DegreeOfSuccess.CriticalSuccess,
          days: EarnDays.parse(365),
        },
        now,
      );

    expect(character.document.inventory.coins).toEqual(CoinsSchema.parse({ pp: 10_951, gp: 3, sp: 4, cp: 5 }));
  });

  test('a failure still logs its entry', () => {
    const [entry] = earn(DegreeOfSuccess.Failure, 2).document.inventory.ledger.slice(-1);

    expect(entry?.reason).toBe(LedgerReason.Income);
    expect(entry?.change).toEqual(CoinChangeSchema.parse({ sp: 1, cp: 6 }));
  });
});
