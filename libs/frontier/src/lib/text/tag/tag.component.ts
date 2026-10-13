import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { LucideIcon } from '@lucide/angular';

import { Badge, BadgeTone } from '../badge/badge.component';

/**
 * A chip for a trait or similar label, fed by data instead of projected content: it is what a table cell or any
 * other component that holds only a string and a tone renders. Markup and styling are `fr-badge`'s.
 */
@Component({
  selector: 'fr-tag',
  imports: [Badge],
  templateUrl: './tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Tag {
  public readonly label = input.required<string>();
  public readonly tone = input<BadgeTone>(BadgeTone.Neutral);
  public readonly icon = input<LucideIcon | undefined>(undefined);
}
