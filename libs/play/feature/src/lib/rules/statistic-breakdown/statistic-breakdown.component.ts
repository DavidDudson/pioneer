import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Stack, Text } from '@pioneer/frontier';

import { BaseTerms } from '../base-terms/base-terms.component';
import { RULE_NAME_KEYS } from '../breakdown-lines';
import { BreakdownList } from '../breakdown-list/breakdown-list.component';
import { OverrideList } from '../override-list/override-list.component';
import type { DerivedRow } from '../statistics-check';

/** Numbers and names in a statistic's breakdown, in the viewer's locale. */
interface Shown {
  readonly baseValue: string;
  readonly computed: string;
  readonly total: string;
  /** The message key and number naming the set override that pinned the total, if one did. */
  readonly pinnedBy: { readonly key: string; readonly number: number } | undefined;
}

/**
 * A derived statistic's breakdown: a note when a set override pinned the total, the base term by term, the
 * modifier lines, then the `Change`s and overrides.
 */
@Component({
  selector: 'pio-statistic-breakdown',
  imports: [BaseTerms, BreakdownList, OverrideList, Stack, Text, TranslocoPipe],
  templateUrl: './statistic-breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticBreakdown {
  readonly #format = inject(LocaleFormat);
  public readonly row = input.required<DerivedRow>();

  protected readonly shown = computed((): Shown => {
    this.#format.locale();
    const row = this.row();
    return {
      baseValue: this.#format.number(row.baseValue),
      computed: this.#format.number(row.computed),
      total: this.#format.number(row.total),
      pinnedBy:
        row.pinnedBy === undefined
          ? undefined
          : { key: RULE_NAME_KEYS[row.pinnedBy.source], number: row.pinnedBy.number },
    };
  });
}
