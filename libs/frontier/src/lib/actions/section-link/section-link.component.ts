import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Link, LinkAppearance } from '../link/link.component';

/**
 * One link of `fr-section-index`: a skip link to an `fr-section`'s anchor, touch-sized because it stands alone.
 * Following it moves focus to the section's heading without navigating.
 */
@Component({
  selector: 'fr-section-link',
  imports: [Link],
  templateUrl: './section-link.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SectionLink {
  /** The `anchor` of the `fr-section` to move focus to. */
  public readonly anchor = input.required<string>();

  protected readonly appearance = LinkAppearance.Index;
}
