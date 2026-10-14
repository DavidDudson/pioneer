import { computed, inject, Injectable, signal } from '@angular/core';
import { RANDOM_SOURCE, rollView } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import {
  checkOutcome,
  degreeOfSuccess,
  DiceExpressionText,
  NO_FORTUNE,
  parseDiceExpression,
  rollWithFortune,
  Sign,
} from '@pioneer/rules/dice';
import type { DiceExpression, FortunedRoll } from '@pioneer/rules/dice';
import type { StatisticValue } from '@pioneer/rules/engine';
import type { Dc } from '@pioneer/rules/sdk';
import { STATISTIC_ROLLER } from '@pioneer/rules/ui';
import type { RollableStatistic, StatisticRoller } from '@pioneer/rules/ui';

/** The check as last rolled: what it was, the dice that fell, and the DC it is compared with, if one is set. */
interface RolledCheck {
  readonly id: number;
  readonly name: string;
  readonly statistic: StatisticValue;
  readonly expression: DiceExpression;
  readonly roll: FortunedRoll;
}

/** The last check rolled from the sheet, as the roll card shows it. */
export interface LastRoll {
  readonly name: string;
  readonly statistic: StatisticValue;
  readonly view: RollView;
}

/** `1d20+7`, `1d20-1`, or a bare `1d20` for a +0 check: the statistic's total added to one d20. */
function checkText(total: number): DiceExpressionText {
  const sign = total < 0 ? Sign.Minus : Sign.Plus;
  return DiceExpressionText.parse(total === 0 ? '1d20' : `1d20${sign}${Math.abs(total)}`);
}

/**
 * Rolls checks for the sheet (#339): a statistic's total from the engine's breakdown, added to one d20 and rolled with
 * the browser's random source. Keeps the last roll for the card in the header. Provided per sheet, and standing in for
 * the `STATISTIC_ROLLER` the statistics rows look for. Fortune and misfortune, and conditional toggles, come with #340.
 */
@Injectable()
export class SheetRolls implements StatisticRoller {
  readonly #random = inject(RANDOM_SOURCE);
  readonly #rolled = signal<RolledCheck | undefined>(undefined);
  #count = 0;

  /** The DC the last roll is compared with; unset until one is typed. A new roll keeps it. */
  public readonly dc = signal<Dc | undefined>(undefined);

  /** The last roll with its degree against the DC, when one is set. */
  public readonly last = computed((): LastRoll | undefined => {
    const rolled = this.#rolled();
    if (rolled === undefined) {
      return undefined;
    }
    const dc = this.dc();
    const kept = rolled.roll.rolls.find((entry) => entry.kept);
    const degree = dc === undefined || kept === undefined ? undefined : degreeOfSuccess(checkOutcome(kept.result), dc);
    const { id, name, statistic, expression, roll } = rolled;
    return { name, statistic, view: rollView(id, { expression, roll, degree, damage: undefined }) };
  });

  public roll({ name, statistic }: RollableStatistic): void {
    const outcome = parseDiceExpression(checkText(statistic.total));
    if (!outcome.ok) {
      return;
    }
    this.#count += 1;
    const roll = rollWithFortune(outcome.expression, NO_FORTUNE, this.#random);
    this.#rolled.set({ id: this.#count, name, statistic, expression: outcome.expression, roll });
  }
}

/** Provides the sheet's rolls under both names: the service the header reads, and the roller statistics look for. */
export const SHEET_ROLLS_PROVIDERS = [SheetRolls, { provide: STATISTIC_ROLLER, useExisting: SheetRolls }];
