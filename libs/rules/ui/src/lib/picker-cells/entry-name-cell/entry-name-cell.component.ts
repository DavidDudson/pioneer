import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Link } from '@pioneer/frontier';
import type { LinkTarget } from '@pioneer/frontier';

/**
 * An entry's name as a link to the page that shows it.
 *
 * ```html
 * <pio-entry-name-cell name="Power Attack" [to]="['/content', 'feat', 'power-attack']" />
 * ```
 */
@Component({
  selector: 'pio-entry-name-cell',
  imports: [Link],
  templateUrl: './entry-name-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryNameCell {
  public readonly name = input.required<string>();
  public readonly to = input.required<LinkTarget>();
}
