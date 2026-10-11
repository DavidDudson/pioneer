import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyState, List, ListItem, LocaleFormat, Meter, Skeleton, Stack, Text } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';
import { filter, merge } from 'rxjs';

import { LINE_STATUS_MESSAGES } from '../../breakdown/breakdown-messages';
import { lineValue } from '../../breakdown/line-words';
import { InventoryMessage } from '../inventory-messages';
import type { Investment, InvestmentEffect } from './investment';

/** An investment as shown: its name and each line it adds, worded. */
interface ShownInvestment {
  readonly id: string;
  readonly name: string;
  /** What it turns on, worded; or that it does nothing, or nothing the sheet shows. */
  readonly effects: readonly string[];
}

/** Message keys the investment panel renders with, spelled out so the key check sees them. */
export const InvestmentMessage = {
  Meter: 'rules.investments.meter',
  Count: 'rules.investments.count',
  None: 'rules.investments.none',
  Off: 'rules.investments.off',
  NothingShown: 'rules.investments.nothingShown',
  Effect: 'rules.investments.effect',
  EffectMarked: 'rules.investments.effectMarked',
} as const;

const LOADING_ROWS = 2;

/**
 * The items a character has invested, counted against the limit, each with what it turns on: the lines it adds to the
 * statistics on the sheet ("Perception +1 item"), marked when they don't count. An item invested but not worn still
 * counts against the limit and says it does nothing.
 *
 * Presentational (ADR-0028): the caller finds the invested items and their lines, or passes undefined while they load.
 *
 * ```html
 * <pio-investments [investments]="investments()" [maximum]="10" />
 * ```
 */
@Component({
  selector: 'pio-investments',
  imports: [EmptyState, List, ListItem, Meter, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './investments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestmentsView {
  public readonly investments = input<readonly Investment[] | undefined>();
  /** The most items the character can have invested. */
  public readonly maximum = input.required<number>();

  protected readonly Message = InvestmentMessage;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly count = computed((): string | undefined => {
    this.#messages();
    const investments = this.investments();
    return investments === undefined
      ? undefined
      : this.#i18n.translate(InvestmentMessage.Count, {
          count: this.#format.number(investments.length),
          maximum: this.#format.number(this.maximum()),
        });
  });

  protected readonly shown = computed((): readonly ShownInvestment[] | undefined => {
    this.#messages();
    this.#format.locale();
    return this.investments()?.map(({ id, name, working, effects }): ShownInvestment => ({
      id,
      name: name ?? this.#i18n.translate(InventoryMessage.UnknownItem),
      effects: this.#effects(working, effects),
    }));
  });

  #effects(working: boolean, effects: readonly InvestmentEffect[]): readonly string[] {
    if (!working) {
      return [this.#i18n.translate(InvestmentMessage.Off)];
    }
    return effects.length === 0
      ? [this.#i18n.translate(InvestmentMessage.NothingShown)]
      : effects.map((effect) => this.#effect(effect));
  }

  /** "Perception +1 item", with the reason it doesn't count when it doesn't. */
  #effect({ statistic, line }: InvestmentEffect): string {
    const value = lineValue(line, this.#i18n, this.#format);
    if (line.status.kind === LineStatusKind.Applied) {
      return this.#i18n.translate(InvestmentMessage.Effect, { statistic, value });
    }
    const status: string = this.#i18n.translate(LINE_STATUS_MESSAGES[line.status.kind]);
    return this.#i18n.translate(InvestmentMessage.EffectMarked, { statistic, value, status });
  }
}
