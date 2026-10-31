import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, Stack, Text } from '@pioneer/frontier';
import { RollCard } from '@pioneer/play/ui';
import { StatisticKind } from '@pioneer/rules/sdk';
import { BreakdownView } from '@pioneer/rules/ui';

import { SheetRollSetup } from '../sheet-roll-setup/sheet-roll-setup.component';
import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';

/**
 * The check last rolled from the sheet (#339), in the header: a roll card with the d20 and its degree against a DC
 * typed on the card, and under it the breakdown the roll was made with, preceded by the check being set up while it has
 * toggles to choose (#340). Nothing shows until a check is rolled or set up.
 */
@Component({
  selector: 'pio-sheet-last-roll',
  imports: [BreakdownView, Disclosure, RollCard, SheetRollSetup, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-last-roll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetLastRoll {
  protected readonly rolls = inject(SheetRolls);
  readonly #sheet = inject(SheetState);
  protected readonly entryNames = this.#sheet.picks.entryNames;
  protected readonly originNames = this.#sheet.originNames;
  protected readonly kind = StatisticKind.Check;
}
