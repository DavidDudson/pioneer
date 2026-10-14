import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import type { HeritagePickerRow } from './origin-picker-row';
import {
  heritagePickerColumns,
  originRowDisabled,
  originRowLabel,
  originRowValue,
  shownHeritageRows,
} from './origin-picker-table';

/**
 * Pick a heritage from a table of its ancestry, what it does and what it grants. Opens inline and starts at the search
 * box. A versatile heritage, which any ancestry can take, says so. The table searches and sorts by name on the rows it
 * is given.
 *
 * ```html
 * <pio-heritage-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Heritage" />
 * ```
 */
@Component({
  selector: 'pio-heritage-picker',
  imports: [Picker],
  templateUrl: './heritage-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class HeritagePicker {
  /** Every heritage the slot offers, with the facts of each. */
  public readonly rows = input.required<readonly HeritagePickerRow[]>();
  /** The picked heritage's id; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** The content is still loading: the table shows its loading state instead of the empty one. */
  public readonly loading = input(false);
  /** A heritage was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the headers and labels are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly columns = computed(() => {
    this.#messages();
    return heritagePickerColumns((key, params) => this.#i18n.translate(key, params));
  });

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => shownHeritageRows(this.rows(), this.query(), this.sorting()));

  protected readonly rowValue = originRowValue;
  protected readonly rowLabel = originRowLabel;
  protected readonly rowDisabled = originRowDisabled;
}
