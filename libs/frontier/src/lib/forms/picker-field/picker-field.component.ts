import { booleanAttribute, ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { Picker } from '../../controls/picker/picker.component';
import type { PickerSort } from '../../controls/picker/picker.component';
import type { TableColumn } from '../../data/table/table-features';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/**
 * Labelled pick-from-a-table field for forms. Bind with `[formField]`; run the query from `searched`, the order
 * from `sorted`, and the next rows from `loadMore`. For inline editing use the plain `fr-picker`.
 */
@Component({
  selector: 'fr-picker-field',
  imports: [Field, FieldError, FieldHint, Label, Picker],
  templateUrl: './picker-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PickerField<TValue extends string, TRow extends object>
  extends BoundField
  implements FormValueControl<TValue | undefined>
{
  public readonly value = model<TValue | undefined>(undefined);
  public readonly rows = input.required<readonly TRow[]>();
  public readonly columns = input.required<readonly TableColumn<TRow>[]>();
  public readonly rowValue = input.required<(row: TRow) => TValue>();
  public readonly rowLabel = input.required<(row: TRow) => string>();
  public readonly rowDisabled = input<(row: TRow) => string | undefined>(() => undefined);
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly loadingMore = input(false, { transform: booleanAttribute });
  public readonly hasMore = input(false, { transform: booleanAttribute });
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly searched = output<string>();
  public readonly sorted = output<PickerSort | undefined>();
  public readonly loadMore = output();
}
