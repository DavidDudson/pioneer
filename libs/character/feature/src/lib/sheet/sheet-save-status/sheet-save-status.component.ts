import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Message, Spinner, Stack, Text } from '@pioneer/frontier';

import { CharacterStore, SaveState } from '../../data/character-store';

/**
 * How the open character's edits stand, for the sheet header: "All changes saved", a spinner while any edit is
 * saving, or why the last one failed with Retry beside it. After a conflict there is nothing to retry: the fields
 * already show the other version.
 */
@Component({
  selector: 'pio-sheet-save-status',
  imports: [AsyncButton, Message, Spinner, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-save-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSaveStatus {
  protected readonly store = inject(CharacterStore);
  protected readonly State = SaveState;
  protected readonly retry = async (): Promise<void> => this.store.retry();
}
