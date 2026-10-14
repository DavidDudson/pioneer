import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import { originRowDisabled, originRowLabel, originRowValue } from '../origin-picker/origin-picker-table';
import type { ClassPickerRow } from './class-picker-row';
import { classPickerColumns, shownClassRows } from './class-picker-table';

/**
 * Pick a class from a table of its key attribute, hit points, trained skills, spellcasting tradition and starting ranks.
 * Opens inline and starts at the search box. The table searches by name and sorts by name or hit points on the rows it
 * is given.
 *
 * ```html
 * <pio-class-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Class" />
 * ```
 */
@Component({
  selector: 'pio-class-picker',
  imports: [Picker],
  templateUrl: './class-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ClassPicker {
  /** Every class the slot offers, with the facts of each. */
  public readonly rows = input.required<readonly ClassPickerRow[]>();
  /** The picked class; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** The content is still loading: the table shows its loading state instead of the empty one. */
  public readonly loading = input(false);
  /** A class was picked: save now. */
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
    return classPickerColumns((key, params) => this.#i18n.translate(key, params));
  });

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => shownClassRows(this.rows(), this.query(), this.sorting()));

  protected readonly rowValue = originRowValue;
  protected readonly rowLabel = originRowLabel;
  protected readonly rowDisabled = originRowDisabled;
}
