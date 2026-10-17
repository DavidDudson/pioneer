import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Text a column sorts by something other than: a level in the UI locale, sorted by its number.
 *
 * ```html
 * <pio-text-cell [text]="row.level" />
 * ```
 */
@Component({
  selector: 'pio-text-cell',
  templateUrl: './text-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextCell {
  public readonly text = input.required<string>();
}
