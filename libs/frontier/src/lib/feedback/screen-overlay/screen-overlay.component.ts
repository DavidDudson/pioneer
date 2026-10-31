import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core';
import { cva } from 'class-variance-authority';

import { NaturalBurst } from '../natural-burst/natural-burst.component';
import type { NaturalBurstKind } from '../natural-burst/natural-burst.component';

const surfaceClasses = cva('size-full')();

/**
 * A transparent layer over the whole viewport that never takes a click, focus or a screen reader's attention: a canvas
 * for the dice to roll across (ADR-0074). `surface` is the element a library draws into, and `burst` flashes a natural 20
 * or natural 1 over it.
 *
 * ```html
 * <fr-screen-overlay />
 * ```
 */
@Component({
  selector: 'fr-screen-overlay',
  imports: [NaturalBurst],
  templateUrl: './screen-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none fixed inset-none z-overlay block', 'aria-hidden': 'true' },
})
export class ScreenOverlay {
  /** The full-size element the overlay's content is drawn into. */
  public readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  /** A natural die to flash over the screen as the dice settle; unset for none. */
  public readonly burst = input<NaturalBurstKind | undefined>(undefined);

  protected readonly surfaceClass = surfaceClasses;
}
