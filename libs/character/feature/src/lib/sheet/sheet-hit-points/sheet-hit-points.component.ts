import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Meter, Skeleton, Stack, Text } from '@pioneer/frontier';

import { PlayStore } from '../../data/play-store';
import { SheetState } from '../sheet-state';
import { hitPointsView, stateMessageOf } from './hit-points-view';
import type { HitPointsView } from './hit-points-view';
import { SheetHitPointControls } from './sheet-hit-point-controls.component';

/**
 * What the Hit Points modal shows: the current number large, temporary Hit Points beside it when there are any, the
 * bar, a word for how hurt the character is, and the damage, heal and temporary Hit Point controls. Until the
 * character has an ancestry and a class there is no maximum, so it says so instead.
 */
@Component({
  selector: 'pio-sheet-hit-points',
  imports: [AsyncData, AsyncPending, AsyncRegion, Meter, SheetHitPointControls, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-hit-points.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHitPoints {
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);

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
