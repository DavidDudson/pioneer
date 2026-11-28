import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CharacterPatchField,
  CORE_EARN_INCOME,
  costCoins,
  earnIncomeDc,
  EarnRank,
  incomeForDays,
  TaskLevel,
} from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Button, Grid, LocaleFormat, NumberField, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { DegreeOfSuccess } from '@pioneer/rules/sdk';
import type { Coin } from '@pioneer/rules/sdk';
import { coinCounts, OptionPicker } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';
import type { Observable } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { COIN_MESSAGES } from '../inventory/coin-ledger/coin-messages';
import { describeSaveError } from '../sheet-field';
import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';
import { EarnIncomeDraftSchema, EarnIncomeSubmissionSchema, EMPTY_EARN_INCOME } from './sheet-earn-income-form';
import type { EarnIncomeModel } from './sheet-earn-income-form';

/** Each degree's label. */
const DEGREE_MESSAGES: Readonly<Record<DegreeOfSuccess, string>> = {
  [DegreeOfSuccess.CriticalSuccess]: 'character.sheet.income.degree.criticalSuccess',
  [DegreeOfSuccess.Success]: 'character.sheet.income.degree.success',
  [DegreeOfSuccess.Failure]: 'character.sheet.income.degree.failure',
  [DegreeOfSuccess.CriticalFailure]: 'character.sheet.income.degree.criticalFailure',
};

/** The payout line when the days earn nothing. */
const NOTHING_EARNED_MESSAGE = 'character.sheet.income.nothing';

/** A skill the character can earn income with: its name, its rank (trained or better) and what the engine derived. */
interface EarnSkill {
  readonly name: string;
  readonly rank: EarnRank;
  readonly statistic: StatisticValue;
}

/** Earn Income: roll a trained skill against the task's DC (or pick the degree), then Collect pays the days into the purse. */
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
  /** Changes when the language changes or the messages load, so the words built below are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded()));
  protected readonly model = signal<EarnIncomeModel>(EMPTY_EARN_INCOME);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, EarnIncomeDraftSchema);
  });

  /** The skills the character can earn income with: trained or better, and derived. */
  readonly #skills: Signal<ReadonlyArray<EarnSkill>> = computed(() =>
    (this.#sheet.picks.skills() ?? []).flatMap(({ name, rank, result }) => {
      const earnRank = EarnRank.safeParse(rank);

      return result.ok && earnRank.success ? [{ name, rank: earnRank.data, statistic: result }] : [];
    }),
  );

  protected readonly skillOptions: Signal<ReadonlyArray<SelectOption<string>>> = computed(() =>
    this.#skills().map((skill) => ({ value: skill.name, label: skill.name })),
  );

  protected readonly degreeOptions: Signal<ReadonlyArray<SelectOption<string>>> = computed(() => {
    this.#messages();

    return Object.values(DegreeOfSuccess).map((degree) => ({
      value: degree,
      label: this.#i18n.translate(DEGREE_MESSAGES[degree]),
    }));
  });

  readonly #chosenSkill = computed(() => this.#skills().find((skill) => skill.name === this.model().skill));
  readonly #level = computed(() => TaskLevel.safeParse(this.model().level));

  /** The DC of the task, when its level is one the table has. */
  protected readonly dc = computed(() => {
    const level = this.#level();

    return level.success ? earnIncomeDc(CORE_EARN_INCOME, level.data) : undefined;
  });

  /** What the days earn, in coins, once the skill, the level, the degree and the days are all set. */
  protected readonly payout: Signal<string | undefined> = computed(() => {
    this.#messages();
    const parsed = EarnIncomeSubmissionSchema.safeParse(this.model());
    const skill = this.#chosenSkill();

    if (!parsed.success || skill === undefined) {
      return undefined;
    }

    const { level, degree, days } = parsed.data;
    const counts = coinCounts(costCoins(incomeForDays(CORE_EARN_INCOME, { level, rank: skill.rank, degree }, days)));

    return counts.length === 0
      ? this.#i18n.translate(NOTHING_EARNED_MESSAGE)
      : counts.map(({ coin, count }) => this.#amount(coin, count)).join(' ');
  });

  /** The roll card's id when Roll was pressed: the degree of the next roll after it is the one to take. */
  readonly #awaiting = signal<number | undefined>(undefined);

  #loaded(): Observable<unknown> {
    return this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  }

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

  /** A skill picked after a roll is not the one that was rolled, so the degree goes. */
  protected pickSkill(skill: string | undefined): void {
    this.#awaiting.set(undefined);
    this.model.update((model) => ({ ...model, skill: skill ?? '', degree: '' }));
  }

  protected pickDegree(degree: string | undefined): void {
    this.model.update((model) => ({ ...model, degree: degree ?? '' }));
  }

  /** Rolls the chosen skill against the task's DC; the degree it reaches fills the form. */
  protected roll(): void {
    const skill = this.#chosenSkill();
    const dc = this.dc();

    if (skill === undefined || dc === undefined) {
      return;
    }

    this.#awaiting.set(this.#rolls.last()?.view.id ?? 0);
    this.#rolls.typeDc(dc);
    this.#rolls.rollAgainst({ name: skill.name, statistic: skill.statistic }, dc);
  }

  protected readonly collect = async (value: EarnIncomeModel): Promise<void> => {
    const { level, degree, days } = EarnIncomeSubmissionSchema.parse(value);
    const rank = this.#chosenSkill()?.rank;

    if (rank === undefined) {
      return;
    }

    await this.#store.patch({ field: CharacterPatchField.EarnIncome, level, rank, degree, days });
    this.model.update((model) => (model.degree === value.degree ? { ...model, degree: '' } : model));
  };

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: Error): string => {
    const { key, params } = describeSaveError(error);

    return this.#i18n.translate(key, params);
  };

  #amount(coin: Coin, count: number): string {
    const name: string = this.#i18n.translate(COIN_MESSAGES[coin]);

    return this.#i18n.translate('character.sheet.inventory.ledger.amount', {
      amount: this.#format.number(count),
      coin: name,
    });
  }
}
