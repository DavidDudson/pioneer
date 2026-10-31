import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, EmptyState, List, ListItem, LocaleFormat, Skeleton, Stack, Text } from '@pioneer/frontier';
import { FormSource, RuleId } from '@pioneer/rules/engine';
import type { BreakdownLine, StatisticResult, StatisticValue } from '@pioneer/rules/engine';
import type { ContentId, Proficiency, Selector, StatisticKind } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { labelName } from '../breakdown/line-words';
import { numberStyle } from '../breakdown/number-style';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import type { RankSource } from '../proficiency-badge/proficiency-badge.component';
import { conditionalLines, conditionalLineText } from './conditional-lines';
import type { ConditionWords } from './conditional-lines';
import { isAdjustedByHand } from './statistic-adjusted';
import { StatisticConditions } from './statistic-conditions/statistic-conditions.component';
import type { ConditionChange, ConditionToggle } from './statistic-conditions/statistic-conditions.component';
import { StatisticLine } from './statistic-line/statistic-line.component';
import { STATISTIC_ROLLER } from './statistic-roller';
import { StatisticsMessage } from './statistics-messages';

/** The conditional lines of a statistic whose situation can be claimed, as the sheet shows them, and the rules claimed. */
export interface StatisticSituations {
  readonly offered: readonly BreakdownLine[];
  readonly claimed: ReadonlySet<RuleId>;
}

/** A statistic to list: its display name, what kind it is, and what the engine derived for it. */
export interface NamedStatistic {
  readonly name: string;
  /** A message key naming it instead, for one no content names (a fist's Strike). */
  readonly nameKey?: string | undefined;
  readonly kind: StatisticKind;
  readonly result: StatisticResult;
  /** A line to show beside it, already worded. */
  readonly note?: string | undefined;
  /** A line for the rank's popover, already worded: the skill two sources train (#673). */
  readonly rankNote?: string | undefined;
  /** The proficiency rank in it, shown as its letter beside the name: a skill's. */
  readonly rank?: Proficiency | undefined;
  /** What gave that rank and the ranks still to come, for the rank's popover. */
  readonly rankSources?: readonly RankSource[] | undefined;
  /** The situations a roll of it can claim, when the page lets the player claim them. */
  readonly situations?: StatisticSituations | undefined;
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
      /** True when a user added a modifier to it by hand; the row says so in text. */
      readonly adjusted: boolean;
      /** "from Plant Form" when a battle form sets the total; undefined otherwise. */
      readonly fromForm: string | undefined;
      /** "+2 circumstance when your shield is raised (Steel Shield)": each line that applies only in some situations and could change the total. */
      readonly conditions: readonly string[];
      /** Each line whose situation can be claimed, as a toggle. */
      readonly toggles: readonly ConditionToggle[];
      readonly kind: StatisticKind;
      readonly rank: Proficiency | undefined;
      readonly rankSources: readonly RankSource[];
      readonly rankNote: string | undefined;
      readonly statistic: StatisticValue;
    }
  | { readonly ok: false; readonly key: Selector; readonly name: string; readonly error: string };

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
    EmptyState,
    List,
    ListItem,
    Skeleton,
    Stack,
    StatisticConditions,
    StatisticLine,
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
  /** Lay each row out as a skill's: name, rank badge, then the roll, with no breakdown disclosure. */
  public readonly skillRows = input(false, { transform: booleanAttribute });

  protected readonly Message = StatisticsMessage;
  protected readonly loadingRows = [...Array.from({ length: LOADING_ROWS }).keys()];

  readonly #roller = inject(STATISTIC_ROLLER, { optional: true });
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`rules`, `predicate`, `engine`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected claim(selector: Selector, { id, on }: ConditionChange): void {
    this.#roller?.claim?.(selector, RuleId.parse(id), on);
  }

  /** What the conditional lines and form names are worded with. */
  #words(): ConditionWords {
    return {
      i18n: this.#i18n,
      format: this.#format,
      names: { entries: this.entryNames(), items: this.originNames().items },
    };
  }

  /** "from Plant Form" when a battle form sets the total; undefined when it does not, or the character's own is higher. */
  #fromForm({ form }: StatisticValue): string | undefined {
    if (form?.source !== FormSource.Form) {
      return undefined;
    }
    const name = labelName(form.label, this.#words().names, ({ key, params }) => this.#i18n.translate(key, params));
    return this.#i18n.translate(StatisticsMessage.FromForm, { form: name });
  }

  protected readonly shown = computed((): readonly ShownStatistic[] | undefined => {
    this.#messages();
    this.#format.locale();
    return this.statistics()?.map(
      ({ name: contentName, nameKey, kind, result, note, rankNote, rank, rankSources, situations }): ShownStatistic => {
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
            : this.#i18n.translate(StatisticsMessage.Computed, {
                computed: this.#format.number(result.computed, style),
              });
        const words = this.#words();
        const fromForm = this.#fromForm(result);
        const offered = this.#roller?.claim === undefined ? [] : (situations?.offered ?? []);
        const conditions = conditionalLines(result, words, new Set(offered.map(({ modifier }) => modifier.id)));
        const toggles = offered.map((line): ConditionToggle => ({
          id: line.modifier.id,
          text: conditionalLineText(line, words),
          on: situations?.claimed.has(line.modifier.id) === true,
        }));
        return {
          ok: true,
          key: result.selector,
          name,
          total,
          computed: unpinned,
          adjusted: isAdjustedByHand(result),
          fromForm,
          conditions: note === undefined ? conditions : [...conditions, note],
          toggles,
          kind,
          rank,
          rankSources: rankSources ?? [],
          rankNote,
          statistic: result,
        };
      },
    );
  });
}
