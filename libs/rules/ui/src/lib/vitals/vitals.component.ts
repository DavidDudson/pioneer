import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Grid, Skeleton, Surface } from '@pioneer/frontier';
import { BaseTermKind } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId, Selector } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { StatisticsView } from '../statistics/statistics.component';
import type { NamedStatistic } from '../statistics/statistics.component';
import { VitalBasisKind } from './vital';
import type { Vital } from './vital';

/** A save's selector starts so: `save:fortitude`. */
const SAVE_PREFIX = 'save:';

/** The class DC's selector, and the start of a spell DC's: `spell-dc:oracle`. */
const CLASS_DC = 'class-dc';
const SPELL_DC_PREFIX = 'spell-dc:';

/** What a base term reading the proficiency bonus starts with. */
const PROF_TERM = '@prof.';

/** A vital with no rank as shown: its statistic as the one-row list `pio-statistics` takes. */
interface VitalTile {
  readonly key: Selector;
  readonly list: readonly NamedStatistic[];
}

/** One card of the row: a tile for a statistic with no rank, or rows laid out as skills are (Armor Class, DCs, saves). */
interface VitalBlock {
  readonly key: Selector;
  readonly tile?: VitalTile;
  readonly rows: readonly NamedStatistic[];
}

/** Placeholder tiles while the vitals load: Armor Class, three saves and Perception. */
const LOADING_TILES = 5;

/** Message keys the vitals render with, spelled out so the key check sees them. */
const VitalsMessage = { Unarmored: 'rules.vitals.unarmored', Proficiency: 'rules.vitals.proficiency' } as const;

/** Vitals that share one card: the saves, and the class DC with the spell DCs. */
const VitalGroup = { Saves: 'saves', Dcs: 'dcs' } as const;
type VitalGroup = (typeof VitalGroup)[keyof typeof VitalGroup];

function groupOf({ statistic }: Vital): VitalGroup | undefined {
  const selector: string = statistic.result.selector;
  if (selector.startsWith(SAVE_PREFIX)) {
    return VitalGroup.Saves;
  }
  return selector === CLASS_DC || selector.startsWith(SPELL_DC_PREFIX) ? VitalGroup.Dcs : undefined;
}

/** A vital as a skill-style row: its statistic with the rank the row shows as a badge, and what sets it as its note. */
function rowOf({ statistic, rank }: Vital, rankNote?: string): NamedStatistic {
  return { ...statistic, rank, rankNote };
}

function tileOf({ statistic }: Vital): VitalTile {
  return { key: statistic.result.selector, list: [statistic] };
}

/**
 * The sheet's vitals row: Armor Class with what sets it, the saves and Perception, each with its total, its rank as a
 * letter and its breakdown in place. A tile per statistic, as many to a row as fit.
 *
 * Read-only and presentational (ADR-0028): the caller passes the vitals in display order, or undefined while they
 * load, and the display names of the entries their breakdown lines come from.
 *
 * ```html
 * <pio-vitals [vitals]="vitals()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-vitals',
  imports: [Grid, Skeleton, StatisticsView, Surface],
  templateUrl: './vitals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsView {
  /** Undefined while loading: the row then shows placeholder tiles. */
  public readonly vitals = input.required<readonly Vital[] | undefined>();
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly loadingTiles = [...Array.from({ length: LOADING_TILES }).keys()];

  readonly #i18n = inject(TranslocoService);
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** Armor Class and the rest as tiles, the saves in one card where the first of them stands. */
  protected readonly blocks = computed((): readonly VitalBlock[] | undefined => {
    this.#messages();
    const vitals = this.vitals();
    if (vitals === undefined) {
      return undefined;
    }
    const rowsOf = (group: VitalGroup): NamedStatistic[] =>
      vitals.flatMap((vital) => (groupOf(vital) === group ? [rowOf(vital), ...this.#proficiencyRows(vital)] : []));
    const placed = new Set<VitalGroup>();
    return vitals.flatMap((vital): VitalBlock[] => {
      const group = groupOf(vital);
      if (group === undefined) {
        const caption = this.#captionOf(vital);
        if (vital.rank !== undefined) {
          return [{ key: vital.statistic.result.selector, rows: [rowOf(vital, caption)] }];
        }
        const tile = tileOf(vital);
        return [{ key: tile.key, tile, rows: [] }];
      }
      if (placed.has(group)) {
        return [];
      }
      placed.add(group);
      return [{ key: vital.statistic.result.selector, rows: rowsOf(group) }];
    });
  });

  /** The class DC's proficiency bonus as a row of its own: the `@prof` term of the DC's base, so a variant rule shows. */
  #proficiencyRows({ statistic }: Vital): NamedStatistic[] {
    const { result } = statistic;
    if (result.selector !== CLASS_DC || !result.ok) {
      return [];
    }
    const term = result.base.find((each) => each.kind === BaseTermKind.Term && each.formula.startsWith(PROF_TERM));
    if (term === undefined) {
      return [];
    }
    const { value } = term;
    const shown = {
      ...result,
      base: [term],
      formulaValue: value,
      baseValue: value,
      lines: [],
      computed: value,
      total: value,
      overrides: [],
      pinnedBy: undefined,
    };
    return [{ name: this.#i18n.translate(VitalsMessage.Proficiency), kind: StatisticKind.Value, result: shown }];
  }

  /** What sets Armor Class, worded: the worn armour's name, or unarmored. Other vitals have none. */
  #captionOf({ basis }: Vital): string | undefined {
    if (basis?.kind === VitalBasisKind.Armor) {
      return basis.name;
    }
    return basis?.kind === VitalBasisKind.Unarmored ? this.#i18n.translate(VitalsMessage.Unarmored) : undefined;
  }
}
