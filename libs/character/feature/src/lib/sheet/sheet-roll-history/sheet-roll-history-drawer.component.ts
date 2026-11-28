import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, DateDisplay, Disclosure, Drawer, Stack, Text } from '@pioneer/frontier';
import { RollCard } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import { StatisticKind } from '@pioneer/rules/sdk';
import { BreakdownView } from '@pioneer/rules/ui';
import { Temporal } from '@pioneer/shared/kernel';

import type { RollHistoryEntry } from '../../data/roll-history-entry';
import { SheetState } from '../sheet-state';
import { historyRollView } from './roll-history-view';
import { SheetRollHistory } from './sheet-roll-history';

/** The query parameter that holds the drawer open in the address, apart from the side panel's. */
const ROLL_HISTORY_PARAM = 'rollHistory';

/** A kept roll as the drawer lists it, worked out once rather than on every pass. */
interface HistoryRow {
  readonly entry: RollHistoryEntry;
  readonly view: RollView;
  readonly when: Temporal.Instant;
}

/** The character's roll history in a drawer beside the sheet: each roll as it was rolled, newest first, and a clear action. */
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
  protected readonly param = ROLL_HISTORY_PARAM;
  protected readonly rows = computed((): ReadonlyArray<HistoryRow> =>
    this.history.open()
      ? this.history.entries().map((entry) => ({
          entry,
          view: historyRollView(entry),
          when: Temporal.Instant.fromEpochMilliseconds(entry.at),
        }))
      : [],
  );
}
