import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { RovingFocusItem } from '../../focus/roving-focus-item.directive';
import { RovingFocus } from '../../focus/roving-focus.directive';
import { Size } from '../../tokens';
import { Control } from '../control';

const groupVariants = cva('flex flex-wrap items-center gap-xs', {
  variants: { invalid: { true: 'outline outline-danger-line', false: '' } },
});

/**
 * A count of points as one toggle per point: `max` pips, the first `value` filled. Pressing an empty pip fills up to
 * it, pressing the last filled pip empties it (one point spent), and each press sets `value` and fires `committed`.
 * Each pip is a toggle named after the group and its place ("Hero Points 2") and announced with `aria-pressed`. The
 * group is one Tab stop; arrow keys, Home and End move between pips.
 *
 * ```html
 * <fr-pips ariaLabel="Hero Points" [max]="3" [(value)]="heroPoints" (committed)="save()" />
 * ```
 */
@Component({
  selector: 'fr-pips',
  imports: [Button, RovingFocus, RovingFocusItem],
  templateUrl: './pips.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Pips extends Control {
  /** The points held: how many pips are filled. */
  public readonly value = model(0);
  /** The points the pool holds at most: how many pips there are. */
  public readonly max = input.required<number>();

  protected readonly variant = ButtonVariant.Toggle;
  protected readonly size = Size.Sm;
  protected readonly groupClasses = computed(() => groupVariants({ invalid: this.ariaInvalid() }));
  /** The places of the pips, from 1. */
  protected readonly places = computed((): readonly number[] => {
    const count = Math.max(Math.floor(this.max()), 0);
    return Array.from({ length: count }, (_unused, index) => index + 1);
  });

  protected press(place: number): void {
    this.value.set(place === this.value() ? place - 1 : place);
    this.committed.emit();
  }

  /** The label of the pip at `place`: the group's, then its place. */
  protected labelOf(place: number): string {
    return `${this.ariaLabel() ?? ''} ${place}`.trim();
  }
}
