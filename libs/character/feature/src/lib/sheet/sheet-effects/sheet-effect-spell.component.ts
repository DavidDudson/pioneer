import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { SelectOption } from '@pioneer/frontier';
import { OptionPicker } from '@pioneer/rules/ui';

/** The picker of the active spell an effect is cast from; it shows nothing while no spell is active. */
@Component({
  selector: 'pio-sheet-effect-spell',
  imports: [OptionPicker, TranslocoPipe],
  templateUrl: './sheet-effect-spell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEffectSpell {
  public readonly spells = input.required<readonly SelectOption<string>[]>();
  public readonly value = input.required<string | undefined>();
  public readonly valueChange = output<string | undefined>();
}
