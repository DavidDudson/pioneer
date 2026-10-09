import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';

import type { StatisticRow as Row } from '../statistics-check';

/** A base term with its value in the viewer's locale. */
interface ShownTerm {
  readonly code: string | undefined;
  readonly value: string;
}

/** One statistic: its selector and base total, then its terms; or its error with a caret under the mistake. */
@Component({
  selector: 'pio-statistic-row',
  imports: [Badge, List, ListItem, Stack, Text, TranslocoPipe],
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

  protected readonly terms = computed((): readonly ShownTerm[] => {
    this.#format.locale();
    const row = this.row();
    const terms = row.ok ? row.terms : [];
    return terms.map((term): ShownTerm => ({ code: term.code, value: this.#format.number(term.value) }));
  });
}
