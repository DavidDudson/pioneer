import { describe, expect, test } from 'bun:test';

import { Coin, COPPER_PER_COIN, CopperValue, Dc, DegreeOfSuccess, Proficiency } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';

import type { Character } from './character';
import { CharacterPatchField } from './character-patch';
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
