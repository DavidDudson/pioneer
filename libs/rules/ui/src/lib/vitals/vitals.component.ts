import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Grid, Skeleton, Stack, Surface, Text } from '@pioneer/frontier';
import type { ContentId, Proficiency, Selector } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { ProficiencyRankView } from '../proficiency-rank/proficiency-rank.component';
import { StatisticsView } from '../statistics/statistics.component';
import type { NamedStatistic } from '../statistics/statistics.component';
import { VitalBasisKind } from './vital';
import type { Vital } from './vital';

/** A save's selector starts so: `save:fortitude`. */
const SAVE_PREFIX = 'save:';

/** A vital as shown: its statistic as the one-row list `pio-statistics` takes, and what sets it. */
interface VitalTile {
  readonly key: Selector;
  readonly list: readonly NamedStatistic[];
  readonly rank: Proficiency | undefined;
  /** What sets Armor Class, worded: the worn armour's name, or unarmored; undefined for any other vital. */
  readonly caption: string | undefined;
}

/** One card of the row: a tile for a single statistic, or the saves together, laid out as skills are. */
interface VitalBlock {
  readonly key: Selector;
  readonly tile?: VitalTile;
  readonly saves: readonly NamedStatistic[];
}

/** Placeholder tiles while the vitals load: Armor Class, three saves and Perception. */
const LOADING_TILES = 5;

/** Message keys the vitals render with, spelled out so the key check sees them. */
const VitalsMessage = { Unarmored: 'rules.vitals.unarmored' } as const;

function isSave({ statistic }: Vital): boolean {
  return statistic.result.selector.startsWith(SAVE_PREFIX);
}

/** A save as a skill-style row: its statistic with the rank the row shows as a badge. */
function rowOf({ statistic, rank }: Vital): NamedStatistic {
  return { ...statistic, rank };
}

function tileOf({ statistic, rank }: Vital, caption: string | undefined): VitalTile {
  return { key: statistic.result.selector, list: [statistic], rank, caption };
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
  imports: [Grid, ProficiencyRankView, Skeleton, Stack, StatisticsView, Surface, Text],
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
    const saves = vitals.filter((vital) => isSave(vital)).map((vital) => rowOf(vital));
    let savesPlaced = false;
    return vitals.flatMap((vital): VitalBlock[] => {
      if (!isSave(vital)) {
        const tile = tileOf(vital, this.#captionOf(vital));
        return [{ key: tile.key, tile, saves: [] }];
      }
      if (savesPlaced) {
        return [];
      }
      savesPlaced = true;
      return [{ key: vital.statistic.result.selector, saves }];
    });
  });

  /** What sets Armor Class, worded: the worn armour's name, or unarmored. Other vitals have none. */
  #captionOf({ basis }: Vital): string | undefined {
    if (basis?.kind === VitalBasisKind.Armor) {
      return basis.name;
    }
    return basis?.kind === VitalBasisKind.Unarmored ? this.#i18n.translate(VitalsMessage.Unarmored) : undefined;
  }
}
