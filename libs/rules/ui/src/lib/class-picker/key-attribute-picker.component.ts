import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';

import { originRowDisabled, originRowLabel, originRowValue } from '../origin-picker/origin-picker-table';
import type { KeyAttributePickerRow } from './class-picker-row';
import { keyAttributePickerColumns, shownKeyAttributeRows } from './class-picker-table';

/**
 * Pick a class's key attribute from a table of the attributes it allows, with the character's modifier and score in
 * each. Opens inline and starts at the search box. The table searches by name and sorts by name or modifier on the rows
 * it is given.
 *
 * ```html
 * <pio-key-attribute-picker frInlineEditor [rows]="rows()" [(value)]="draft" ariaLabel="Key attribute" />
 * ```
 */
@Component({
  selector: 'pio-key-attribute-picker',
  imports: [Picker],
  templateUrl: './key-attribute-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class KeyAttributePicker {
  /** Every attribute the class allows, with the character's standing in it. */
  public readonly rows = input.required<ReadonlyArray<KeyAttributePickerRow>>();
  /** The picked key attribute; undefined until picked. */
  public readonly value = model<string | undefined>(undefined);
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly disabled = input(false);
  /** The content is still loading: the table shows its loading state instead of the empty one. */
  public readonly loading = input(false);
  /** A key attribute was picked: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  protected readonly columns = computed(() => keyAttributePickerColumns());

  /** The rows whose name holds what was typed, in the order asked for. */
  protected readonly shown = computed(() => shownKeyAttributeRows(this.rows(), this.query(), this.sorting()));

  protected readonly rowValue = originRowValue;
  protected readonly rowLabel = originRowLabel;
  protected readonly rowDisabled = originRowDisabled;
}
