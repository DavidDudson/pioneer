import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Clamp, ClampLines } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { RichTextView } from '../../rich-text/rich-text.component';

/**
 * A short rich-text summary cut off after a few lines, so it never grows its row.
 *
 * ```html
 * <pio-summary-cell [text]="feat.summary" />
 * ```
 */
@Component({
  selector: 'pio-summary-cell',
  imports: [Clamp, RichTextView],
  templateUrl: './summary-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryCell {
  public readonly text = input.required<RichText>();
  public readonly lines = input<ClampLines>(ClampLines.Two);
}
