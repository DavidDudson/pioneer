import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, Skeleton, Stack, Surface, Text } from '@pioneer/frontier';
import type { ContentId, Proficiency, Selector } from '@pioneer/rules/sdk';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { ProficiencyRankView } from '../proficiency-rank/proficiency-rank.component';
import { StatisticsView } from '../statistics/statistics.component';
import type { NamedStatistic } from '../statistics/statistics.component';
import { VitalBasisKind } from './vital';
import type { Vital } from './vital';

/** A vital as shown: its statistic as the one-row list `pio-statistics` takes, and what sets it. */
interface VitalTile {
  readonly key: Selector;
  readonly list: readonly NamedStatistic[];
  readonly rank: Proficiency | undefined;
  /** The worn armour's name, when armour sets it. */
  readonly armor: string | undefined;
  readonly unarmored: boolean;
}

/** Placeholder tiles while the vitals load: Armor Class, three saves and Perception. */
const LOADING_TILES = 5;

/** Message keys the vitals render with, spelled out so the key check sees them. */
const VitalsMessage = { Unarmored: 'rules.vitals.unarmored' } as const;

function tileOf({ statistic, rank, basis }: Vital): VitalTile {
  return {
    key: statistic.result.selector,
    list: [statistic],
    rank,
    armor: basis?.kind === VitalBasisKind.Armor ? basis.name : undefined,
    unarmored: basis?.kind === VitalBasisKind.Unarmored,
  };
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
  imports: [Grid, ProficiencyRankView, Skeleton, Stack, StatisticsView, Surface, Text, TranslocoPipe],
  templateUrl: './vitals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsView {
  /** Undefined while loading: the row then shows placeholder tiles. */
  public readonly vitals = input.required<readonly Vital[] | undefined>();
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly Message = VitalsMessage;
  protected readonly loadingTiles = [...Array.from({ length: LOADING_TILES }).keys()];
  protected readonly tiles = computed((): readonly VitalTile[] | undefined =>
    this.vitals()?.map((vital) => tileOf(vital)),
  );
}
