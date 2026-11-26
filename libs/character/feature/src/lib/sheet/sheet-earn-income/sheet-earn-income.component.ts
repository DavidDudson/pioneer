import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CharacterPatchField,
  CORE_EARN_INCOME,
  costCoins,
  earnIncomeDc,
  EarnRank,
  incomePerDay,
  TaskLevel,
} from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Button, Grid, LocaleFormat, NumberField, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { CopperValue, DegreeOfSuccess } from '@pioneer/rules/sdk';
import type { Coin } from '@pioneer/rules/sdk';
import { coinCounts, OptionPicker } from '@pioneer/rules/ui';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { COIN_MESSAGES } from '../inventory/coin-ledger/coin-ledger.component';
import { describeSaveError } from '../sheet-field';
import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';
import { EarnIncomeFields, EarnIncomeForm, EMPTY_EARN_INCOME } from './sheet-earn-income-form';
import type { EarnIncomeModel } from './sheet-earn-income-form';

/** Each degree's label. */
const DEGREE_MESSAGES: Readonly<Record<DegreeOfSuccess, string>> = {
  [DegreeOfSuccess.CriticalSuccess]: 'character.sheet.income.degree.criticalSuccess',
  [DegreeOfSuccess.Success]: 'character.sheet.income.degree.success',
  [DegreeOfSuccess.Failure]: 'character.sheet.income.degree.failure',
  [DegreeOfSuccess.CriticalFailure]: 'character.sheet.income.degree.criticalFailure',
};

/** What the payout line shows when the form is complete: the coins the days earn, as text. */
const NOTHING_EARNED = 'character.sheet.income.nothing';

/**
 * Earn Income (Player Core): the character works a task of some level with a skill they are trained in, rolls the
 * skill against the task's DC, and is paid for each day by the degree it reached. **Roll** rolls the skill against the
 * DC through the sheet's roll card and fills in the degree; the degree can also be picked by hand, for a roll made at
 * the table. **Collect** sends one `earnIncome`, which pays the days into the purse and logs them in the ledger. Only
 * skills trained or better are offered: the table has no column for an untrained character.
 */
@Component({
  selector: 'pio-sheet-earn-income',
  imports: [AsyncButton, AsyncForm, Button, FormField, Grid, NumberField, OptionPicker, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-earn-income.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEarnIncome {
  readonly #store = inject(CharacterStore);
  readonly #sheet = inject(SheetState);
  readonly #rolls = inject(SheetRolls);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);

  protected readonly model = signal<EarnIncomeModel>(EMPTY_EARN_INCOME);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, EarnIncomeFields);
  });

  /** The skills the character can earn income with: trained or better, and derived. */
  readonly #skills: Signal<readonly NamedStatistic[]> = computed(() =>
    (this.#sheet.picks.skills() ?? []).filter((skill) => skill.result.ok && EarnRank.safeParse(skill.rank).success),
  );

  protected readonly skillOptions: Signal<readonly SelectOption<string>[]> = computed(() =>
    this.#skills().map((skill) => ({ value: skill.name, label: skill.name })),
  );

  protected readonly degreeOptions: readonly SelectOption<string>[] = Object.values(DegreeOfSuccess).map((degree) => ({
    value: degree,
    label: this.#i18n.translate(DEGREE_MESSAGES[degree]),
  }));

  readonly #chosen = computed(() => this.#skills().find((skill) => skill.name === this.model().skill));
  readonly #level = computed(() => TaskLevel.safeParse(this.model().level));

  /** The DC of the task, when its level is one the table has. */
  protected readonly dc = computed(() => {
    const level = this.#level();

    return level.success ? earnIncomeDc(CORE_EARN_INCOME, level.data) : undefined;
  });

  /** What the days earn, in coins, once the skill, the level, the degree and the days are all set. */
  protected readonly payout: Signal<string | undefined> = computed(() => {
    const parsed = EarnIncomeForm.safeParse(this.model());
    const rank = EarnRank.safeParse(this.#chosen()?.rank);

    if (!parsed.success || !rank.success) {
      return undefined;
    }

    const { level, degree, days } = parsed.data;
    const copper = CopperValue.parse(incomePerDay(CORE_EARN_INCOME, { level, rank: rank.data, degree }) * days);
    const counts = coinCounts(costCoins(copper));

    return counts.length === 0
      ? this.#i18n.translate(NOTHING_EARNED)
      : counts.map(({ coin, count }) => this.#amount(coin, count)).join(' ');
  });

  #amount(coin: Coin, count: number): string {
    const name: string = this.#i18n.translate(COIN_MESSAGES[coin]);

    return this.#i18n.translate('character.sheet.inventory.ledger.amount', {
      amount: this.#format.number(count),
      coin: name,
    });
  }

  /** The roll card's id when Roll was pressed: the degree of the next roll after it is the one to take. */
  readonly #awaiting = signal<number | undefined>(undefined);

  public constructor() {
    effect(() => {
      const awaiting = this.#awaiting();
      const view = this.#rolls.last()?.view;

      if (awaiting === undefined || view === undefined || view.id <= awaiting || view.degree === undefined) {
        return;
      }

      this.#awaiting.set(undefined);
      this.model.update((model) => ({ ...model, degree: view.degree?.degree ?? model.degree }));
    });
  }

  protected pickSkill(skill: string | undefined): void {
    this.model.update((model) => ({ ...model, skill: skill ?? '' }));
  }

  protected pickDegree(degree: string | undefined): void {
    this.model.update((model) => ({ ...model, degree: degree ?? '' }));
  }

  /** Rolls the chosen skill against the task's DC; the degree it reaches fills the form. */
  protected roll(): void {
    const skill = this.#chosen();
    const dc = this.dc();

    if (skill === undefined || dc === undefined || !skill.result.ok) {
      return;
    }

    this.#awaiting.set(this.#rolls.last()?.view.id ?? 0);
    this.#rolls.typeDc(dc);
    this.#rolls.rollAgainst({ name: skill.name, statistic: skill.result }, dc);
  }

  protected readonly collect = async (value: EarnIncomeModel): Promise<void> => {
    const { level, degree, days } = EarnIncomeForm.parse(value);
    const rank = EarnRank.parse(this.#chosen()?.rank);

    await this.#store.patch({ field: CharacterPatchField.EarnIncome, level, rank, degree, days });
    this.model.update((model) => ({ ...model, degree: '' }));
  };

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: Error): string => {
    const { key, params } = describeSaveError(error);

    return this.#i18n.translate(key, params);
  };
}
