import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Disclosure, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { DiscrepancyKind } from '@pioneer/interop/pathbuilder';
import type { Discrepancy, DiscrepancyReport } from '@pioneer/interop/pathbuilder';
import type { StatisticValue } from '@pioneer/rules/engine';
import type { ContentId, Selector, StatisticKind } from '@pioneer/rules/sdk';
import { BreakdownView, PROFICIENCY_NAMES } from '@pioneer/rules/ui';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { SIGNED } from '../import-labels';
import { statisticLabel } from '../import-statistic-labels';

interface Totals {
  readonly pathbuilder: string;
  readonly pioneer: string;
}

interface Ranks {
  readonly pathbuilder: string;
  readonly pioneer: string;
}

/** A statistic that differs, as the list shows it: both values and the difference worded, and its breakdown. */
interface DiscrepancyView {
  readonly selector: Selector;
  readonly name: string;
  /** A total Pathbuilder computed and Pioneer's, in the viewer's locale; absent for a rank. */
  readonly totals: Totals | undefined;
  /** The message keys naming the two ranks; absent for a total. */
  readonly ranks: Ranks | undefined;
  readonly difference: string;
  readonly kind: StatisticKind | undefined;
  /** What the engine derived, when it could; the breakdown of why Pioneer's value is what it is. */
  readonly statistic: StatisticValue | undefined;
}

/**
 * The numbers Pathbuilder computed that Pioneer's engine derives differently for the imported character (#312): each
 * statistic beside both values and the difference, with a disclosure of the breakdown that explains Pioneer's. Matching
 * statistics collapse into one line.
 */
@Component({
  selector: 'pio-import-discrepancy-report',
  imports: [BreakdownView, Disclosure, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './import-discrepancy-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportDiscrepancyReport {
  public readonly report = input.required<DiscrepancyReport>();
  /** The engine's result and name for each statistic, by selector; a statistic missing here shows its selector. */
  public readonly statistics = input<ReadonlyMap<Selector, NamedStatistic>>(new Map());
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());

  readonly #format = inject(LocaleFormat);
  readonly #i18n = inject(TranslocoService);

  protected readonly nothingCompared = computed(() => this.report().compared === 0);
  protected readonly allMatch = computed(() => !this.nothingCompared() && this.report().differences.length === 0);

  protected readonly rows = computed((): readonly DiscrepancyView[] =>
    this.report().differences.map((difference) => this.#view(difference)),
  );

  #view(difference: Discrepancy): DiscrepancyView {
    const named = this.statistics().get(difference.selector);
    const label = named === undefined ? statisticLabel(difference.selector) : undefined;
    const base = {
      selector: difference.selector,
      name: label === undefined ? (named?.name ?? difference.selector) : this.#i18n.translate(label.key, label.params),
      difference: this.#format.number(difference.difference, SIGNED),
      kind: named?.kind,
      statistic: named?.result.ok === true ? named.result : undefined,
    };
    return difference.kind === DiscrepancyKind.Total
      ? {
          ...base,
          ranks: undefined,
          totals: {
            pathbuilder: this.#format.number(difference.pathbuilder),
            pioneer: this.#format.number(difference.pioneer),
          },
        }
      : {
          ...base,
          totals: undefined,
          ranks: {
            pathbuilder: PROFICIENCY_NAMES[difference.pathbuilder],
            pioneer: PROFICIENCY_NAMES[difference.pioneer],
          },
        };
  }
}
