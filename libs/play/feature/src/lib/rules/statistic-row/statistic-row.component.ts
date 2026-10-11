import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { BreakdownView } from '@pioneer/rules/ui';

import type { StatisticRow as Row } from '../statistics-check';

/**
 * One statistic: its selector and total, flagged when a set override pinned it, then the shared inspector's
 * breakdown, which names the override and keeps the computed value in view; or its error.
 */
@Component({
  selector: 'pio-statistic-row',
  imports: [Badge, BreakdownView, Stack, Text, TranslocoPipe],
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
}
