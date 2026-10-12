import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, Disclosure, EmptyState, List, ListItem, LocaleFormat, Skeleton, Stack, Text } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';
import type { BreakdownLine, StatisticResult, StatisticValue } from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import type { ContentId, Selector, StatisticKind } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { BreakdownView } from '../breakdown/breakdown.component';
import { labelName, lineValue, summaryFormat } from '../breakdown/line-words';
import { numberStyle } from '../breakdown/number-style';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { StatisticConditions } from './statistic-conditions/statistic-conditions.component';
import { StatisticTotal } from './statistic-total/statistic-total.component';
import { StatisticsMessage } from './statistics-messages';

/** A statistic to list: its display name, what kind it is, and what the engine derived for it. */
export interface NamedStatistic {
  readonly name: string;
  /** A message key naming it instead, for one no content names (a fist's Strike). */
  readonly nameKey?: string | undefined;
  readonly kind: StatisticKind;
  readonly result: StatisticResult;
}

/** A statistic as shown: its total, its conditional lines and breakdown, or why it has none. */
type ShownStatistic =
  | {
      readonly ok: true;
      readonly key: Selector;
      readonly name: string;
      readonly total: string;
      /** "computed 18" when a set override pinned the total; undefined otherwise. */
      readonly computed: string | undefined;
      /** "+2 circumstance when your shield is raised (Steel Shield)": each line that applies only in some situations and could change the total. */
      readonly conditions: readonly string[];
      readonly kind: StatisticKind;
      readonly statistic: StatisticValue;
    }
  | { readonly ok: false; readonly key: Selector; readonly name: string; readonly error: string };

/** A line the engine could not settle on the sheet, and when it would hold. */
interface ConditionalLine {
  readonly line: BreakdownLine;
  readonly summary: PredicateSummary | undefined;
}

/** Rows of placeholders while the statistics load: the core rules' AC, three saves and Perception. */
const LOADING_ROWS = 5;

/**
 * A list of statistics (play-and-campaigns.md, "Statistics and breakdowns"): each one's name and total, a check signed (+5) and
 * a DC or value plain (18), and the total expands in place to its breakdown. Under the total, each modifier that
 * applies only in some situations reads as its value, type, when it holds and where it comes from ("+2 circumstance
 * when your shield is raised (Steel Shield)"), in the engine's order (rules-engine.md, "Predicates and conditional
 * modifiers"); one an applied line of its type already beats is left out, since it could never change the total, and
 * the breakdown says what beats it. A statistic the engine could not derive is marked failed in text, with why. A total a set override
 * pinned is marked pinned in text, with the computed value beside it.
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
  imports: [
    Badge,
    BreakdownView,
    Disclosure,
    EmptyState,
    List,
    ListItem,
    Skeleton,
    Stack,
    StatisticConditions,
    StatisticTotal,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsView {
  /** Undefined while loading: the list then shows placeholder rows. */
  public readonly statistics = input.required<readonly NamedStatistic[] | undefined>();
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the breakdown lines' origin chains refer to beyond entries. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);
  /** What an empty list says: no statistics, unless the caller names what it lists (no Strikes). */
  public readonly noneKey = input<string>(StatisticsMessage.None);

  protected readonly Message = StatisticsMessage;
  protected readonly loadingRows = [...Array.from({ length: LOADING_ROWS }).keys()];

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`rules`, `predicate`, `engine`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): readonly ShownStatistic[] | undefined => {
    this.#messages();
    this.#format.locale();
    return this.statistics()?.map(({ name: contentName, nameKey, kind, result }): ShownStatistic => {
      const name = nameKey === undefined ? contentName : this.#i18n.translate(nameKey);
      if (!result.ok) {
        return {
          ok: false,
          key: result.selector,
          name,
          error: this.#i18n.translate(result.error.key, result.error.params),
        };
      }
      const style = numberStyle(kind);
      const total = this.#format.number(result.total, style);
      const unpinned =
        result.pinnedBy === undefined
          ? undefined
          : this.#i18n.translate(StatisticsMessage.Computed, { computed: this.#format.number(result.computed, style) });
      const conditions = result.lines
        .flatMap((line): ConditionalLine[] =>
          line.status.kind === LineStatusKind.Conditional && line.status.beatenBy === undefined
            ? [{ line, summary: line.status.summary }]
            : [],
        )
        .map((conditional) => this.#condition(conditional));
      return { ok: true, key: result.selector, name, total, computed: unpinned, conditions, kind, statistic: result };
    });
  });

  /** "+2 circumstance when your shield is raised (Steel Shield)"; "in some situations" when nothing words when. */
  #condition({ line, summary }: ConditionalLine): string {
    return this.#i18n.translate(StatisticsMessage.Conditional, {
      value: lineValue(line, this.#i18n, this.#format),
      hasSummary: summary === undefined ? 'no' : 'yes',
      summary: summary === undefined ? '' : formatSummary(summary, summaryFormat(this.#i18n, this.#format)),
      name: labelName(line.modifier.label, this.entryNames(), (descriptor) =>
        this.#i18n.translate(descriptor.key, descriptor.params),
      ),
    });
  }
}
