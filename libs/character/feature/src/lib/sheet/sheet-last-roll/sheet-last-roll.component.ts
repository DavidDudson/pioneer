import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, Stack, Text } from '@pioneer/frontier';
import { RollCard } from '@pioneer/play/ui';
import { StatisticKind } from '@pioneer/rules/sdk';
import { BreakdownView } from '@pioneer/rules/ui';

import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';

/**
 * The check last rolled from the sheet (#339), in the header: a roll card with the d20 and its degree against a DC
 * typed on the card, and under it the breakdown the roll was made with. Nothing shows until a check is rolled.
 */
@Component({
  selector: 'pio-sheet-last-roll',
  imports: [BreakdownView, Disclosure, RollCard, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-last-roll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetLastRoll {
  protected readonly rolls = inject(SheetRolls);
  protected readonly entryNames = inject(SheetState).picks.entryNames;
  protected readonly kind = StatisticKind.Check;
}
