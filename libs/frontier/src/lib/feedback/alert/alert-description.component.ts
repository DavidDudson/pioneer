import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Text } from '../../text/text/text.component';

/** The detail under an `fr-alert-title`: what happened and what to do, in body copy. */
@Component({
  selector: 'fr-alert-description',
  imports: [Text],
  templateUrl: './alert-description.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AlertDescription {}
