import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideDownload } from '@lucide/angular';
import { AsyncButton, ButtonVariant, Icon, Stack } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';

import { CharacterStore } from '../../data/character-store';
import { exportFileName, saveJsonFile } from '../sheet-export-file';

/**
 * Export as JSON (#665): downloads the open character as a Pioneer character file. The server writes the file, so a
 * character using content no loaded pack has is refused with the reason, not saved with a hole in it.
 */
@Component({
  selector: 'pio-sheet-export',
  imports: [AsyncButton, Icon, Stack, TranslocoPipe],
  templateUrl: './sheet-export.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetExport {
  readonly #document = inject(DOCUMENT);
  readonly #i18n = inject(TranslocoService);
  readonly #store = inject(CharacterStore);

  protected readonly icon = LucideDownload;
  protected readonly variant = ButtonVariant.Menu;

  protected readonly download = async (): Promise<void> => {
    const name = this.#store.selected()?.name ?? '';
    const file = await this.#store.exportPioneer();
    saveJsonFile(this.#document, exportFileName(name), file);
  };

  /** The server's reason (content not loaded), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const [issue] = error instanceof ApiError ? error.issues : [];
    const { key, params } = issue?.message ?? message('character.sheet.export.failed');
    return this.#i18n.translate(key, params);
  };
}
