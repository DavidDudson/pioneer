import { OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  DestroyRef,
  effect,
  inject,
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
  /** Fires each time the card opens, so a page can load what the card shows. */
  public readonly opened = output();

  protected readonly open = signal(false);
  protected readonly id = uniqueId('fr-hover-card');
  protected readonly triggerClasses = triggerClasses;
  protected readonly cardClasses = cardClasses;

  #pointer = false;
  #focus = false;
  #timer: Subscription | undefined;

  public constructor() {
    effect(() => {
      if (this.open()) {
        this.opened.emit();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.#clear();
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
