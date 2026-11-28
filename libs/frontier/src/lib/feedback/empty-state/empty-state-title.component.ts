import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Text } from '../../text/text/text.component';

/** What is missing, as text rather than a heading. */
@Component({
  selector: 'fr-empty-state-title',
  imports: [Text],
  templateUrl: './empty-state-title.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmptyStateTitle {}
