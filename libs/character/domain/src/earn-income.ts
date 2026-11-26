import { Coin, CopperValue, Dc, DegreeOfSuccess, Proficiency } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import type { CharacterPatch, CharacterPatchField } from './character-patch';
import { withCoins } from './coin-ledger-edits';
import { CoinAmount } from './coins';
import type { Coins } from './coins';
import { TASK_LEVEL_MAX } from './earn-income-fields';
import type { EarnDays, EarnRank, TaskLevel } from './earn-income-fields';
import data from './earn-income.json';
import { coinsOf } from './purse';

const EarnRanksSchema = z.strictObject({
  [Proficiency.Trained]: CopperValue,
  [Proficiency.Expert]: CopperValue,
  [Proficiency.Master]: CopperValue,
  [Proficiency.Legendary]: CopperValue,
});

const TaskLevelRowSchema = EarnRanksSchema.extend({ dc: Dc, failed: CopperValue });

/** What a day of a task earns, in copper, level 0 first: Player Core Table 4-2, as data like the treasure table (ADR-0064). */
const EarnIncomeTableSchema = z.strictObject({
  levels: z
    .array(TaskLevelRowSchema)
    .length(TASK_LEVEL_MAX + 1)
    .readonly(),
  criticalAtMax: EarnRanksSchema,
});

export type EarnIncomeTable = z.infer<typeof EarnIncomeTableSchema>;

/** The core rules' Income Earned table (Player Core). */
export const CORE_EARN_INCOME: EarnIncomeTable = EarnIncomeTableSchema.parse(data);

/** The edit that records days of work for pay. */
export type EarnIncomePatch = Extract<CharacterPatch, { readonly field: typeof CharacterPatchField.EarnIncome }>;

/** One day of a task: its level, the rank in the skill and the degree of success the check reached. */
export interface EarnCheck {
  readonly level: TaskLevel;
  readonly rank: EarnRank;
  readonly degree: DegreeOfSuccess;
}

const NO_INCOME = CopperValue.parse(0);
const NEXT_LEVEL = 1;

type TaskLevelRow = z.infer<typeof TaskLevelRowSchema>;

function levelRow(table: EarnIncomeTable, level: TaskLevel): TaskLevelRow {
  const row = table.levels[level];

  if (row === undefined) {
    throw new TypeError(`The income table has no task level ${level}`);
  }

  return row;
}

/** The DC to roll against for a task of `level`. */
export function earnIncomeDc(table: EarnIncomeTable, level: TaskLevel): Dc {
  return levelRow(table, level).dc;
}

/** What one day earns, in copper: nothing on a critical failure, the failed column on a failure, else the rank's column. */
export function incomePerDay(table: EarnIncomeTable, { level, rank, degree }: EarnCheck): CopperValue {
  const row = levelRow(table, level);

  switch (degree) {
    case DegreeOfSuccess.CriticalFailure: {
      return NO_INCOME;
    }

    case DegreeOfSuccess.Failure: {
      return row.failed;
    }

    case DegreeOfSuccess.Success: {
      return row[rank];
    }

    case DegreeOfSuccess.CriticalSuccess: {
      return (table.levels[level + NEXT_LEVEL] ?? table.criticalAtMax)[rank];
    }

    default: {
      return degree satisfies never;
    }
  }
}

/** What `days` days of the task earn in all, in copper. */
export function incomeForDays(table: EarnIncomeTable, check: EarnCheck, days: EarnDays): CopperValue {
  return CopperValue.parse(incomePerDay(table, check) * days);
}

/** The purse with the income of `days` days of the task added, in the fewest coins and each coin kept as it was. */
function withIncomeCoins(coins: Coins, check: EarnCheck, days: EarnDays): Coins {
  const earned = coinsOf(incomeForDays(CORE_EARN_INCOME, check, days));

  return {
    [Coin.Platinum]: CoinAmount.parse(coins[Coin.Platinum] + earned[Coin.Platinum]),
    [Coin.Gold]: CoinAmount.parse(coins[Coin.Gold] + earned[Coin.Gold]),
    [Coin.Silver]: CoinAmount.parse(coins[Coin.Silver] + earned[Coin.Silver]),
    [Coin.Copper]: CoinAmount.parse(coins[Coin.Copper] + earned[Coin.Copper]),
  };
}

/** `document` with the days of work the patch records paid into its purse. */
export function withEarnedIncome(document: CharacterDocument, patch: EarnIncomePatch): CharacterDocument {
  const { level, rank, degree, days } = patch;
  const coins = withIncomeCoins(document.inventory.coins, { level, rank, degree }, days);

  return withCoins(document, coins);
}
