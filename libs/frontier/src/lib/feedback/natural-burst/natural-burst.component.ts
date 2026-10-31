import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

/** Which natural die the burst marks: a 20 (`high`, gold) or a 1 (`low`, red and shaking). */
export const NaturalBurstKind = { High: 'high', Low: 'low' } as const;
export type NaturalBurstKind = ValueOf<typeof NaturalBurstKind>;

const burstClasses = cva('border-lg pointer-events-none fixed inset-none z-overlay block', {
  variants: {
    kind: {
      [NaturalBurstKind.High]: 'animate-natural-flash border-natural-max bg-natural-max',
      [NaturalBurstKind.Low]: 'animate-natural-flash-shake border-natural-min bg-natural-min',
    } satisfies Record<NaturalBurstKind, string>,
  },
});

/**
 * A flash over the whole viewport when a natural 20 or natural 1 settles: a gold wash and frame for the 20, a red one
 * that also shakes for the 1. It fades on its own, never takes a click, focus or a screen reader's attention, and
 * reduced motion shortens it to nothing.
 *
 * ```html
 * <fr-natural-burst kind="high" />
 * ```
 */
@Component({
  selector: 'fr-natural-burst',
  templateUrl: './natural-burst.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'aria-hidden': 'true' },
})
export class NaturalBurst {
  public readonly kind = input.required<NaturalBurstKind>();

  protected readonly classes = computed((): string => burstClasses({ kind: this.kind() }));
}
