import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { EffectCommandField } from '@pioneer/character/domain';
import { FormBanner } from '@pioneer/rules/ui';
import type { FormSummary } from '@pioneer/rules/ui';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';

/**
 * The form the character is in (#528), in the header on every tab: named in words with its source, rank and time left,
 * with Dismiss, and a toggle that shows the sheet without the form for reference. Empty when the character is in none.
 */
@Component({
  selector: 'pio-sheet-form',
  imports: [FormBanner],
  templateUrl: './sheet-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetForm {
  protected readonly sheet = inject(SheetState);
  readonly #play = inject(PlayStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly summary = computed((): FormSummary | undefined => {
    const form = this.sheet.activeForm();
    return form === undefined ? undefined : { name: form.name, details: form.details };
  });

  /** Ends the form, which also gives back the temporary Hit Points it gave. */
  protected readonly dismiss = async (): Promise<void> => {
    const form = this.sheet.activeForm();
    if (form !== undefined) {
      await this.#play.send({ field: EffectCommandField.RemoveEffect, id: form.id });
    }
  };

  /** The server's reason (a conflict or a refusal), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
