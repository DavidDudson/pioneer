import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Stack } from '../../layout/stack/stack.component';
import { Space } from '../../tokens';

/**
 * A run of `fr-field`s (or the form components built on them). It owns the gap between one field and the next, so
 * a form never sets it field by field.
 *
 * ```html
 * <fr-field-group>
 *   <fr-text-field …/>
 *   <fr-number-field …/>
 * </fr-field-group>
 * ```
 */
@Component({
  selector: 'fr-field-group',
  imports: [Stack],
  templateUrl: './field-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FieldGroup {
  protected readonly gap = Space.Md;
}
