import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { elevationVariants, Inset, paddingVariants } from '../../tokens';
import type { Padding } from '../../tokens';

/** What a panel pads itself with unless told otherwise. */
export const DEFAULT_SURFACE_PADDING: Padding = Inset.Panel;

export const surfaceVariants = cva(`block border ${elevationVariants.raised}`, {
  variants: { padding: paddingVariants },
});

/** A panel: background, border and padding from tokens. Sharp and flat: a stronger border, not a shadow. */
@Component({
  selector: 'fr-surface',
  templateUrl: './surface.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Surface {
  public readonly padding = input<Padding>(DEFAULT_SURFACE_PADDING);

  protected readonly classes = computed(() => surfaceVariants({ padding: this.padding() }));
}
