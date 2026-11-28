import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { injectTranslate } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';

import { originRowDisabled, originRowLabel, originRowValue } from '../origin-picker/origin-picker-table';
import type { LanguagePickerRow } from './slot-picker-row';
import { languagePickerColumns, shownLanguageRows } from './slot-picker-table';

/**
 * Pick a language from a table of its rarity and whether the character knows it already. Opens inline and starts at
 * the search box. The table searches by name and sorts by name or rarity on the rows it is given.
 *
 * ```html
 * <pio-language-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Language" />
 * ```
 */
@Component({
  selector: 'pio-language-picker',
  imports: [Picker],
  templateUrl: './language-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class LanguagePicker {
  /** Every language the next open slot offers. */
  public readonly rows = input.required<ReadonlyArray<LanguagePickerRow>>();
  /** The picked language; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** The content is still loading: the table shows its loading state instead of the empty one. */
  public readonly loading = input(false);
  /** A language was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  readonly #i18n = inject(TranslocoService);
  /** Changes when the language changes or the messages load, so the headers and labels are read again. */
  readonly #messages = injectTranslate();

  protected readonly columns = computed(() => {
    this.#messages();

    return languagePickerColumns((key, params) => this.#i18n.translate(key, params));
  });

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => shownLanguageRows(this.rows(), this.query(), this.sorting()));

  protected readonly rowValue = originRowValue;
  protected readonly rowLabel = originRowLabel;
  protected readonly rowDisabled = originRowDisabled;
}
