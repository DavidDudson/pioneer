import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Button, Meter, Skeleton, Stack, Surface, Text } from '@pioneer/frontier';

import { PlayStore } from '../../data/play-store';
import { SheetState } from '../sheet-state';
import { HitPointsDrawerState } from './hit-points-drawer-state';
import { hitPointsView, stateMessageOf } from './hit-points-view';
import type { HitPointsView } from './hit-points-view';

/**
 * The Hit Points block at the top of the sheet: the current number large, temporary Hit Points beside it when there are
 * any, the total, the bar, and under it a word for how hurt the character is. No controls and no number input: the
 * block is one button, and pressing it opens the damage, heal and temporary Hit Point controls in a drawer. Until the
 * character has an ancestry and a class there is no maximum, so it says so instead.
 */
@Component({
  selector: 'pio-sheet-hit-points',
  imports: [AsyncData, AsyncPending, AsyncRegion, Button, Meter, Skeleton, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './sheet-hit-points.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHitPoints {
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);

  protected readonly drawer = inject(HitPointsDrawerState);

  protected readonly hp = computed((): HitPointsView | undefined =>
    hitPointsView(this.#sheet.maxHitPoints(), this.#play.play.data()?.play.hp),
  );
  /** The word for how hurt the character is, as a message key; none while above half. */
  protected readonly state = computed(() => {
    const hp = this.hp();
    return hp === undefined ? undefined : stateMessageOf(hp);
  });

  /** The reads behind Hit Points, each shown in its own region so a failure reads as one. */
  protected readonly playQuery = this.#play.play;
  protected readonly engineQuery = this.#sheet.engineQuery;
}
