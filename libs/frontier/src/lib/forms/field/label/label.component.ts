import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { textVariants } from '../../../text/text.variants';
import { Field } from '../field.component';

const labelVariants = cva(textVariants({ variant: 'label' }), {
  variants: { hidden: { true: 'sr-only', false: '' } },
});

/** The field's label; points at the field's control. `visuallyHidden` keeps it for screen readers only. */
@Component({
  selector: 'fr-label',
  templateUrl: './label.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Label {
  public readonly visuallyHidden = input(false, { transform: booleanAttribute });

  protected readonly field = inject(Field);
  protected readonly classes = computed(() => labelVariants({ hidden: this.visuallyHidden() }));
}
