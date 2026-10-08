import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';

import { Text } from '../../../text/text/text.component';
import { Field } from '../field.component';

/** Help text under the control; the control is described by it while present. */
@Component({
  selector: 'fr-field-hint',
  imports: [Text],
  templateUrl: './hint.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.id]': 'field.hintId', class: 'block' },
})
export class FieldHint {
  protected readonly field = inject(Field);

  public constructor() {
    inject(DestroyRef).onDestroy(this.field.register('hint'));
  }
}
