import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { SelectOption } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';

import { injectOptionRows } from './inject-option-rows';

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
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  public readonly ariaLabel = input.required<string>();
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly value = model<TValue | undefined>(undefined);

  protected readonly table = injectOptionRows<TValue>(computed(() => this.options()));
}
