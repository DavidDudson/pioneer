import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glyph, LocaleFormat } from '@pioneer/frontier';

import { PickerCellMessage } from '../picker-cell-messages';

/**
 * A level as its number, read out as "Level 3". Nothing when the row has no level.
 *
 * ```html
 * <pio-level-cell [value]="feat.level" />
 * ```
 */
@Component({
  selector: 'pio-level-cell',
  imports: [Glyph, TranslocoPipe],
  templateUrl: './level-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelCell {
  public readonly value = input.required<number | undefined>();

  readonly #format = inject(LocaleFormat);
  protected readonly Message = PickerCellMessage;
  protected readonly shown = computed(() => {
    const level = this.value();

    return level === undefined ? undefined : this.#format.number(level);
  });
}
