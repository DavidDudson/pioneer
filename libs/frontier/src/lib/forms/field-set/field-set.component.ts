import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { textVariants } from '../../text/text.variants';
import { FieldGroup } from '../field-group/field-group.component';

const fieldSetClasses = cva('min-w-none')();

const legendVariants = cva(textVariants({ variant: 'label' }), {
  variants: { hidden: { true: 'sr-only', false: 'pb-xs' } },
});

/**
 * The one owner of `<fieldset>` and `<legend>`: related fields under one name, which assistive technology reads
 * before each field's own label. The fields sit in an `fr-field-group`. `legendHidden` keeps the legend for
 * screen readers only.
 *
 * ```html
 * <fr-field-set [legend]="'character.identity.legend' | transloco">
 *   <fr-text-field …/>
 *   <fr-text-field …/>
 * </fr-field-set>
 * ```
 */
@Component({
  selector: 'fr-field-set',
  imports: [FieldGroup],
  templateUrl: './field-set.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FieldSet {
  /** The name of the set, already translated. */
  public readonly legend = input.required<string>();
  public readonly legendHidden = input(false, { transform: booleanAttribute });

  protected readonly fieldSetClasses = fieldSetClasses;
  protected readonly legendClasses = computed(() => legendVariants({ hidden: this.legendHidden() }));
}
