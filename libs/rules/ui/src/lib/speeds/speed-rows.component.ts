import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { IconGlyph } from '@pioneer/frontier';
import {
  Button,
  ButtonVariant,
  HoverCard,
  HoverCardContent,
  Icon,
  LocaleFormat,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { Bird, Footprints, Mountain, Shovel, WavesHorizontal } from 'lucide';

import { BreakdownView } from '../breakdown/breakdown.component';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import type { NamedStatistic } from '../statistics/statistics.component';
import { Movement, MOVEMENT_MESSAGES, SpeedsMessage } from './speeds-messages';

/** One kind of movement and the Speed the engine derived for it; none when the character has no such Speed. */
export interface SpeedRow {
  readonly movement: Movement;
  readonly speed: NamedStatistic | undefined;
}

/** A row as shown: its name and icon, and the total with the breakdown behind it when there is a Speed. */
interface ShownSpeed {
  readonly movement: Movement;
  readonly name: string;
  readonly icon: IconGlyph;
  readonly total: string | undefined;
  readonly statistic: StatisticValue | undefined;
  readonly kind: StatisticKind;
}

const ICONS: Readonly<Record<Movement, IconGlyph>> = {
  [Movement.Walk]: Footprints,
  [Movement.Swim]: WavesHorizontal,
  [Movement.Fly]: Bird,
  [Movement.Climb]: Mountain,
  [Movement.Burrow]: Shovel,
};

/**
 * A character's Speeds as rows, one per kind of movement (Walk, Swim, Fly, Climb, Burrow), each an icon, its name and its distance
 * in feet, the total opening its breakdown on hover. A kind the character lacks reads "None".
 *
 * Read-only and presentational (ADR-0028): the caller passes a row for each kind, or undefined while they load.
 *
 * ```html
 * <pio-speed-rows [speeds]="speeds()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-speed-rows',
  imports: [BreakdownView, Button, HoverCard, HoverCardContent, Icon, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './speed-rows.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeedRows {
  /** Undefined while loading: each row then shows a placeholder. */
  public readonly speeds = input.required<readonly SpeedRow[] | undefined>();
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  readonly #format = inject(LocaleFormat);
  protected readonly Message = SpeedsMessage;
  protected readonly inline = ButtonVariant.Inline;
  protected readonly loaded = computed((): boolean => this.speeds() !== undefined);
  protected readonly rows = computed((): readonly ShownSpeed[] => {
    const speeds = this.speeds();
    return Object.values(Movement).map((movement): ShownSpeed => {
      const { result, kind } = speeds?.find((row) => row.movement === movement)?.speed ?? {
        result: undefined,
        kind: StatisticKind.Value,
      };
      const held = result?.ok === true && result.total > 0 ? result : undefined;
      return {
        movement,
        name: MOVEMENT_MESSAGES[movement],
        icon: ICONS[movement],
        total: held === undefined ? undefined : this.#format.number(held.total),
        statistic: held,
        kind,
      };
    });
  });
}
