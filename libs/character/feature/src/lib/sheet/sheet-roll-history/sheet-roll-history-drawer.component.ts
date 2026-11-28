import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, DateDisplay, Disclosure, Drawer, Stack, Text } from '@pioneer/frontier';
import { RollCard } from '@pioneer/play/ui';
import { StatisticKind } from '@pioneer/rules/sdk';
import { BreakdownView } from '@pioneer/rules/ui';
import { Temporal } from '@pioneer/shared/kernel';

import type { RollHistoryEntry } from '../../data/roll-history-entry';
import { SheetState } from '../sheet-state';
import { historyRollView } from './roll-history-view';
import { SheetRollHistory } from './sheet-roll-history';

/**
 * The character's roll history, newest first, in a drawer beside the sheet: each roll as the roll card showed it, with
 * the breakdown it was made with, and an action that clears the lot. Its host takes no room, so the drawer lays out
 * as a child of the page.
 */
@Component({
  selector: 'pio-sheet-roll-history-drawer',
  imports: [BreakdownView, Button, DateDisplay, Disclosure, Drawer, RollCard, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-roll-history-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetRollHistoryDrawer {
  protected readonly history = inject(SheetRollHistory);
  readonly #sheet = inject(SheetState);
  protected readonly entryNames = this.#sheet.picks.entryNames;
  protected readonly originNames = this.#sheet.originNames;
  protected readonly kind = StatisticKind.Check;
  protected readonly clearVariant = ButtonVariant.Danger;
  protected readonly view = historyRollView;

  // oxlint-disable-next-line class-methods-use-this -- the template calls it; it needs no state
  protected when({ at }: RollHistoryEntry): Temporal.Instant {
    return Temporal.Instant.fromEpochMilliseconds(at);
  }
}
