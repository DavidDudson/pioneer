import { Directive } from '@angular/core';

import { Field } from '../../forms/field/field.component';

/**
 * Hides an enclosing `fr-field` from the chips: the group takes the field's label, and each toggle
 * button would otherwise claim the field's control id. It sits on the group element, so
 * `fr-filter-chips` itself still sees the field.
 */
@Directive({
  selector: '[frChipGroup]',
  providers: [{ provide: Field, useValue: undefined }],
})
export class ChipGroup {}
