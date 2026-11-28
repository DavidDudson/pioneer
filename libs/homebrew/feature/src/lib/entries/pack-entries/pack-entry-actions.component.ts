import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, Link } from '@pioneer/frontier';
import type { HomebrewEntrySummary } from '@pioneer/homebrew/domain';

import { describeEntryError } from '../../data/entry-errors';
import { HomebrewStore } from '../../data/homebrew-store';

/**
 * What sits beside an entry: a live one can be edited or archived, an archived one restored. Both act on the first
 * press, since each undoes the other.
 */
@Component({
  selector: 'pio-pack-entry-actions',
  imports: [AsyncButton, Link, TranslocoPipe],
  templateUrl: './pack-entry-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackEntryActions {
  public readonly entry = input.required<HomebrewEntrySummary>();

  readonly #store = inject(HomebrewStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly archive = async (): Promise<void> => {
    const { packId, id } = this.entry();
    await this.#store.archiveEntry(packId, id);
  };

  protected readonly restore = async (): Promise<void> => {
    const { packId, id } = this.entry();
    await this.#store.restoreEntry(packId, id);
  };

  protected readonly describeArchiveError = (error: Error): string =>
    describeEntryError(this.#i18n, error, 'homebrew.entry.archiveFailed');

  protected readonly describeRestoreError = (error: Error): string =>
    describeEntryError(this.#i18n, error, 'homebrew.entry.restoreFailed');
}
