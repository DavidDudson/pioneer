import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant } from '@pioneer/frontier';
import type { RollView } from '@pioneer/play/ui';

import { historyRollView } from './roll-history-view';
import { SheetRollHistory } from './sheet-roll-history';

/** The last roll as the header names it. */
interface LastRollSummary {
  readonly name: string;
  readonly view: RollView;
}

/**
 * The header's entry for the roll history (#342): the last roll's total and degree, which opens the history. Nothing
 * shows until a roll has been made, here or on an earlier visit.
 */
@Component({
  selector: 'pio-sheet-roll-history-button',
  imports: [Button, TranslocoPipe],
  templateUrl: './sheet-roll-history-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRollHistoryButton {
  protected readonly history = inject(SheetRollHistory);
  protected readonly variant = ButtonVariant.Secondary;
  protected readonly last = computed((): LastRollSummary | undefined => {
    const newest = this.history.newest();

    return newest === undefined ? undefined : { name: newest.name, view: historyRollView(newest) };
  });
}
