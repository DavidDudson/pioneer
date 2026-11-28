import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Stack } from '../../layout/stack/stack.component';

/** Groups the title and description of an `fr-empty-state`. */
@Component({
  selector: 'fr-empty-state-header',
  imports: [Stack],
  templateUrl: './empty-state-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmptyStateHeader {}
