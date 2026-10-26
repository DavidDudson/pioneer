import { OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  booleanAttribute,
  Component,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Milliseconds } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';
import { timer } from 'rxjs';
import type { Subscription } from 'rxjs';

import { uniqueId } from '../../ids';
import { HoverCardContent } from './hover-card-content.directive';

const HOVER_DELAY: Milliseconds = Milliseconds.parse(200);

const triggerClasses = cva('inline')();
const cardClasses = cva('z-overlay mt-2xs max-w-prose border border-line-default bg-surface-overlay p-sm text-body')();

/**
 * A preview that opens beside what it describes while the pointer rests on it or focus is inside it, and closes
 * when both leave or on Escape. It never takes focus or blocks the page, so it is a description, not a dialog.
 * Touch has no hover: a first tap on the trigger opens the card and does not follow the link, a second tap follows it,
 * unless `tapOpens` is off, when the tap goes through to the trigger and the card stays closed.
 * Project the trigger; the first focusable child (a link) is what a keyboard reaches. Give the preview as an
 * `<ng-template frHoverCardContent>`, created only while open.
 *
 * ```html
 * <fr-hover-card>
 *   <fr-link [to]="target">Fireball</fr-link>
 *   <ng-template frHoverCardContent>…</ng-template>
 * </fr-hover-card>
 * ```
 */
@Component({
  selector: 'fr-hover-card',
  imports: [NgTemplateOutlet, OverlayModule],
  templateUrl: './hover-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class HoverCard {
  protected readonly content = contentChild(HoverCardContent);
  /** Whether a touch tap on the trigger opens the card first; off for a trigger a tap must act on, like a button. */
  public readonly tapOpens = input(true, { transform: booleanAttribute });
  /** Fires each time the card opens, so a page can load what the card shows. */
  public readonly opened = output();

  protected readonly open = signal(false);
  protected readonly id = uniqueId('fr-hover-card');
  protected readonly triggerClasses = triggerClasses;
  protected readonly cardClasses = cardClasses;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #pointer = false;
  #focus = false;
  #timer: Subscription | undefined;

  public constructor() {
    effect(() => {
      if (this.open()) {
        this.opened.emit();
      }
    });
    const host = this.#host.nativeElement;
    // Capture phase, so the first tap is stopped before the projected link follows it.
    host.addEventListener('click', this.#tap, { capture: true });
    inject(DestroyRef).onDestroy(() => {
      this.#clear();
      host.removeEventListener('click', this.#tap, { capture: true });
    });
  }

  protected pointer(inside: boolean): void {
    this.#pointer = inside;
    this.#settle(HOVER_DELAY);
  }

  protected focus(inside: boolean): void {
    this.#focus = inside;
    this.#settle(0);
  }

  /**
   * A touch tap while the card is closed opens it instead of activating the trigger. Touch is read from the click
   * itself, so a keyboard Enter (a click with no pointer type) or a mouse click is never mistaken for a tap.
   */
  readonly #tap = (event: MouseEvent): void => {
    const touch = event instanceof PointerEvent && event.pointerType === 'touch';
    if (touch && this.tapOpens() && !this.open() && this.content() !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      this.#clear();
      this.open.set(true);
    }
  };

  protected escape(): void {
    this.#clear();
    this.#pointer = false;
    this.#focus = false;
    this.open.set(false);
  }

  /** Opens or closes after `delay` to match whether pointer or focus is inside, so crossing the gap doesn't flicker. */
  #settle(delay: number): void {
    this.#clear();
    this.#timer = timer(delay).subscribe(() => {
      this.open.set(this.content() !== undefined && (this.#pointer || this.#focus));
    });
  }

  #clear(): void {
    this.#timer?.unsubscribe();
    this.#timer = undefined;
  }
}
