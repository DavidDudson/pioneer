import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, LocaleFormat, Stack, Text } from '@pioneer/frontier';

import { BaseTerms } from '../base-terms/base-terms.component';
import { BreakdownList } from '../breakdown-list/breakdown-list.component';
import type { StatisticRow as Row } from '../statistics-check';

/** One statistic: its selector and total, its base term by term, then its modifier lines; or its error. */
@Component({
  selector: 'pio-statistic-row',
  imports: [Badge, BaseTerms, BreakdownList, Stack, Text, TranslocoPipe],
  templateUrl: './statistic-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticRow {
  readonly #format = inject(LocaleFormat);
  public readonly row = input.required<Row>();

  /** The total in the viewer's locale, while there is one. */
  protected readonly total = computed((): string => {
    this.#format.locale();
    const row = this.row();
    return row.ok ? this.#format.number(row.total) : '';
  });

  /** The base before modifiers, in the viewer's locale. */
  protected readonly baseValue = computed((): string => {
    this.#format.locale();
    const row = this.row();
    return row.ok ? this.#format.number(row.baseValue) : '';
  });
}
