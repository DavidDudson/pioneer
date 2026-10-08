import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';

import { Message } from '../../../feedback/message/message.component';
import { Field } from '../field.component';

/** The field's problem, inline under the control; the control is described by it while present. */
@Component({
  selector: 'fr-field-error',
  imports: [Message],
  templateUrl: './error.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FieldError {
  protected readonly field = inject(Field);

  public constructor() {
    inject(DestroyRef).onDestroy(this.field.register('error'));
  }
}
