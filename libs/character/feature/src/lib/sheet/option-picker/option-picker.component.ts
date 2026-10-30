import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { SelectOption } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import { PickerRows } from '../inventory/picker-rows';
import { optionColumns, optionLabel, optionOrder, optionValue } from './option-rows';

/**
 * A short fixed list as a picker (ADR 0054): the caller hands over every option, and the picker searches and sorts
 * them in the page by label, in one name column.
 */
@Component({
  selector: 'pio-option-picker',
  imports: [Picker],
  templateUrl: './option-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptionPicker<TValue extends string> {
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  public readonly ariaLabel = input.required<string>();
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly value = model<TValue | undefined>(undefined);

  protected readonly rows = new PickerRows<SelectOption<TValue>>(
    computed(() => this.options()),
    optionOrder<TValue>(),
  );
  protected readonly rowValue = optionValue<TValue>;
  protected readonly rowLabel = optionLabel;
  protected readonly columns = computed(() => {
    this.#messages();
    return optionColumns<TValue>(this.#i18n.translate('character.sheet.optionColumns.name'));
  });
}
