import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Text } from '../../text/text/text.component';

/** What to do about it, in muted body copy under the title. */
@Component({
  selector: 'fr-empty-state-description',
  imports: [Text],
  templateUrl: './empty-state-description.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmptyStateDescription {}
