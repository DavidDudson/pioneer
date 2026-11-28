import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';

import { originRowDisabled, originRowLabel, originRowValue } from '../origin-picker/origin-picker-table';
import type { SubclassPickerRow } from './class-picker-row';
import { shownSubclassRows, subclassPickerColumns } from './class-picker-table';

/**
 * Pick a subclass (a doctrine, muse, order or school) from a table of what each grants. Opens inline and starts at the
 * search box. The table searches and sorts by name on the rows it is given.
 *
 * ```html
 * <pio-subclass-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Subclass" />
 * ```
 */
@Component({
  selector: 'pio-subclass-picker',
  imports: [Picker],
  templateUrl: './subclass-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SubclassPicker {
  /** Every subclass the class offers, with what each grants. */
  public readonly rows = input.required<ReadonlyArray<SubclassPickerRow>>();
  /** The picked subclass; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** The content is still loading: the table shows its loading state instead of the empty one. */
  public readonly loading = input(false);
  /** A subclass was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  protected readonly columns = computed(() => subclassPickerColumns());

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => shownSubclassRows(this.rows(), this.query(), this.sorting()));

  protected readonly rowValue = originRowValue;
  protected readonly rowLabel = originRowLabel;
  protected readonly rowDisabled = originRowDisabled;
}
