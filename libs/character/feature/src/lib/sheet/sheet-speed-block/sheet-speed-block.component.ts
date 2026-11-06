import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Surface } from '@pioneer/frontier';
import { Selector } from '@pioneer/rules/sdk';
import { Movement, SpeedRows } from '@pioneer/rules/ui';
import type { SpeedRow } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';

/** The Speed each kind of movement reads. */
const SPEEDS: Readonly<Record<Movement, Selector>> = {
  [Movement.Walk]: Selector.parse('speed:land'),
  [Movement.Swim]: Selector.parse('speed:swim'),
  [Movement.Fly]: Selector.parse('speed:fly'),
  [Movement.Climb]: Selector.parse('speed:climb'),
  [Movement.Burrow]: Selector.parse('speed:burrow'),
};

/** Walk, Swim, Fly, Climb and Burrow as icon rows in a card of the sheet's header row; a Speed the character lacks reads "None". */
@Component({
  selector: 'pio-sheet-speed-block',
  imports: [Surface, SpeedRows],
  templateUrl: './sheet-speed-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetSpeedBlock {
  protected readonly sheet = inject(SheetState);
  /** Undefined while the statistics load. */
  protected readonly speeds = computed((): readonly SpeedRow[] | undefined => {
    const statistics = this.sheet.picks.statistics();
    return statistics === undefined
      ? undefined
      : Object.values(Movement).map((movement) => ({
          movement,
          speed: statistics.find(({ result }) => result.selector === SPEEDS[movement]),
        }));
  });
}
