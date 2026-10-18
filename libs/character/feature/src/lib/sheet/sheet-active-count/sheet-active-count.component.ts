import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, Text } from '@pioneer/frontier';

import { PlayStore } from '../../data/play-store';
import { activeCount } from '../sheet-active-list';
import { SheetActiveList } from '../sheet-active-list/sheet-active-list.component';

/** The count of active spells and effects the shared header shows (#357); it opens the active list in place. */
@Component({
  selector: 'pio-sheet-active-count',
  imports: [Disclosure, SheetActiveList, Text, TranslocoPipe],
  templateUrl: './sheet-active-count.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetActiveCount {
  readonly #play = inject(PlayStore);

  protected readonly count = computed((): number => {
    const read = this.#play.play.data();
    return read === undefined ? 0 : activeCount(read.play);
  });
}
