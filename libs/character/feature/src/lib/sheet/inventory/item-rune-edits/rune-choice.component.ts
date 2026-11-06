import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { SelectOption } from '@pioneer/frontier';
import { OptionPicker } from '@pioneer/rules/ui';

/** What a rune is made for, picked while etching it: nothing for a rune that takes no choice. */
@Component({
  selector: 'pio-rune-choice',
  imports: [OptionPicker, TranslocoPipe],
  templateUrl: './rune-choice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuneChoicePicker {
  public readonly options = input.required<readonly SelectOption<string>[]>();
  public readonly value = model<string | undefined>(undefined);
}
