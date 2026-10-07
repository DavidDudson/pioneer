import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { PADDING, Space } from '../../tokens';

export const SurfaceVariant = { Base: 'base', Raised: 'raised', Sunken: 'sunken', Outline: 'outline' } as const;
export type SurfaceVariant = ValueOf<typeof SurfaceVariant>;

const VARIANT: Record<SurfaceVariant, string> = {
  base: 'bg-surface-base',
  raised: 'bg-surface-raised shadow-raised border border-line-subtle',
  sunken: 'bg-surface-sunken',
  outline: 'border border-line-default',
};

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

  protected readonly classes = computed(() =>
    ['block rounded-surface', VARIANT[this.variant()], PADDING[this.padding()]].join(' '),
  );
}
