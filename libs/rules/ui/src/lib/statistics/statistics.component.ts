import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, Disclosure, EmptyState, List, ListItem, LocaleFormat, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { StatisticResult, StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId, Selector } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { BreakdownView } from '../breakdown/breakdown.component';
import { StatisticsMessage } from './statistics-messages';

/** A statistic to list: its display name, what kind it is, and what the engine derived for it. */
export interface NamedStatistic {
  readonly name: string;
  readonly kind: StatisticKind;
  readonly result: StatisticResult;
}

/** A statistic as shown: its total and breakdown, or why it has none. */
type ShownStatistic =
  | {
      readonly ok: true;
      readonly key: Selector;
      readonly name: string;
      readonly total: string;
      readonly statistic: StatisticValue;
    }
  | { readonly ok: false; readonly key: Selector; readonly name: string; readonly error: string };

/** A check reads as the modifier you roll, so it always has a sign; a DC or a plain value has none. */
const CHECK: Intl.NumberFormatOptions = { signDisplay: 'always' };

/** Rows of placeholders while the statistics load: the core rules' AC, three saves and Perception. */
const LOADING_ROWS = 5;

/**
 * A list of statistics (play-and-campaigns.md, "Statistics and breakdowns"): each one's name and total, a check signed (+5) and
 * a DC or value plain (18), and the total expands in place to its breakdown. A statistic the engine could not
 * derive is marked failed in text, with why.
 *
 * Read-only and presentational (ADR-0028): the caller passes the statistics in display order with their names, or
 * undefined while they load, and the display names of the entries their lines come from.
 *
 * ```html
 * <pio-statistics [statistics]="statistics()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-statistics',
  imports: [Badge, BreakdownView, Disclosure, EmptyState, List, ListItem, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsView {
  /** Undefined while loading: the list then shows placeholder rows. */
  public readonly statistics = input.required<readonly NamedStatistic[] | undefined>();
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());

  protected readonly Message = StatisticsMessage;
  protected readonly loadingRows = [...Array.from({ length: LOADING_ROWS }).keys()];

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`rules`, `engine`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): readonly ShownStatistic[] | undefined => {
    this.#messages();
    this.#format.locale();
    return this.statistics()?.map(({ name, kind, result }): ShownStatistic => {
      if (!result.ok) {
        return {
          ok: false,
          key: result.selector,
          name,
          error: this.#i18n.translate(result.error.key, result.error.params),
        };
      }
      const total = this.#format.number(result.total, kind === StatisticKind.Check ? CHECK : {});
      return { ok: true, key: result.selector, name, total, statistic: result };
    });
  });
}
