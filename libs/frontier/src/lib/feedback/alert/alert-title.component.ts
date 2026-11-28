import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Text } from '../../text/text/text.component';

/** The heading line of an `fr-alert`: the medium-weight summary, in the alert's tone. */
@Component({
  selector: 'fr-alert-title',
  imports: [Text],
  templateUrl: './alert-title.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AlertTitle {}
