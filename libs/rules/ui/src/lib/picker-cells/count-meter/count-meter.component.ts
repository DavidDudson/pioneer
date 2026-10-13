import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Meter, MeterVariant, Stack, Text } from '@pioneer/frontier';

import { PickerCellMessage } from '../picker-cell-messages';

/**
 * A count out of a total as a segmented meter with the figures beside it: slots used, charges left.
 *
 * ```html
 * <pio-count-meter [value]="2" [max]="4" [label]="'Slots used'" />
 * ```
 */
@Component({
  selector: 'pio-count-meter',
  imports: [Meter, Stack, Text, TranslocoPipe],
  templateUrl: './count-meter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountMeter {
  public readonly value = input.required<number>();
  public readonly max = input.required<number>();
  /** What is counted, already translated; the meter is read out as it. */
  public readonly label = input.required<string>();

  readonly #format = inject(LocaleFormat);
  protected readonly Message = PickerCellMessage;
  protected readonly Segmented = MeterVariant.Segmented;
  protected readonly figures = computed(() => ({
    value: this.#format.number(this.value()),
    max: this.#format.number(this.max()),
  }));
}
