import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Size } from '../../tokens';

const SIZE: Record<Size, string> = { sm: 'size-sm', md: 'size-md', lg: 'size-lg' };

/** Indeterminate progress. Decorative unless given a label. */
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

  protected readonly classes = computed(() => `inline-block shrink-0 animate-spin ${SIZE[this.size()]}`);
}
