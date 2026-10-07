import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text.directive';

let fieldCount = 0;

function nextFieldId(): string {
  fieldCount += 1;
  return `fr-field-${fieldCount}`;
}

/** Label, hint and error around one control. Used by every frontier input. */
@Component({
  selector: 'fr-field',
  imports: [Stack, Text],
  templateUrl: './field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Field {
  public readonly label = input.required<string>();
  public readonly hint = input<string | undefined>(undefined);
  public readonly error = input<string | undefined>(undefined);
  public readonly controlId = input(nextFieldId());
  public readonly hideLabel = input(false, { transform: booleanAttribute });
}
