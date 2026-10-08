import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Size } from '../../tokens';

const spinnerVariants = cva('inline-block shrink-0 animate-spin', {
  variants: { size: { sm: 'size-sm', md: 'size-md', lg: 'size-lg' } satisfies Record<Size, string> },
});
const svgClasses = cva('size-full')();

/** Indeterminate progress for an action in flight. Decorative unless given a label. */
@Component({
  selector: 'fr-spinner',
  templateUrl: './spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'label() === undefined ? null : "status"',
    '[attr.aria-label]': 'label() ?? null',
    '[attr.aria-hidden]': 'label() === undefined ? "true" : null',
  },
})
export class Spinner {
  public readonly size = input<Size>(Size.Sm);
  public readonly label = input<string | undefined>(undefined);

  protected readonly classes = computed(() => spinnerVariants({ size: this.size() }));
  protected readonly svgClasses = svgClasses;
}
