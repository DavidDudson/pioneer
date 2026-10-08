import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideLoaderCircle } from '@lucide/angular';

import { Icon } from '../../icon/icon.component';
import { Size } from '../../tokens';

/** Indeterminate progress for an action in flight. Decorative unless given a label. */
@Component({
  selector: 'fr-spinner',
  imports: [Icon],
  templateUrl: './spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0',
    '[attr.role]': 'label() === undefined ? null : "status"',
    '[attr.aria-label]': 'label() ?? null',
    '[attr.aria-hidden]': 'label() === undefined ? "true" : null',
  },
})
export class Spinner {
  public readonly size = input<Size>(Size.Sm);
  public readonly label = input<string | undefined>(undefined);

  protected readonly LoaderIcon = LucideLoaderCircle;
}
