import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { paddingVariants, Space } from '../../tokens';

export const SurfaceVariant = { Base: 'base', Raised: 'raised', Sunken: 'sunken', Outline: 'outline' } as const;
export type SurfaceVariant = ValueOf<typeof SurfaceVariant>;

const surfaceVariants = cva('block rounded-surface', {
  variants: {
    variant: {
      base: 'bg-surface-base',
      raised: 'bg-surface-raised shadow-raised border border-line-subtle',
      sunken: 'bg-surface-sunken',
      outline: 'border border-line-default',
    } satisfies Record<SurfaceVariant, string>,
    padding: paddingVariants,
  },
});

/** A panel: background, border, radius and padding from tokens. */
@Component({
  selector: 'fr-surface',
  templateUrl: './surface.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Surface {
  public readonly variant = input<SurfaceVariant>(SurfaceVariant.Raised);
  public readonly padding = input<Space>(Space.Lg);

  protected readonly classes = computed(() => surfaceVariants({ variant: this.variant(), padding: this.padding() }));
}
