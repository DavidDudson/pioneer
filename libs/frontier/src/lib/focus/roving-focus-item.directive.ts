import { booleanAttribute, computed, Directive, ElementRef, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import { Button } from '../actions/button/button.component';

/** Elements that take focus without a `tabindex`, or already have one; an item focuses the first of these it holds. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

const NOT_SELECTED = signal(false).asReadonly();

/**
 * One stop in a `[frRovingFocus]` group. Put it on the element to focus or on a host that renders it: on
 * `fr-button` it finds the native `<button>` inside and follows the button's `disabled`.
 *
 * A component can carry it as a host directive and report its own selection with `followSelected` (`fr-tab` follows
 * its link's current page).
 */
@Directive({ selector: '[frRovingFocusItem]' })
export class RovingFocusItem {
  /** Holds the group's tab stop while focus is outside the group, e.g. the chosen option. */
  public readonly rovingSelected = input(false, { transform: booleanAttribute });
  /** Skipped by the arrow keys and never the tab stop. Not needed on `fr-button`, which reports its own. */
  public readonly rovingDisabled = input(false, { transform: booleanAttribute });

  /** A disabled item can't take focus, so the group skips it. */
  public readonly enabled: Signal<boolean>;
  /** `rovingSelected`, or the selection its host component reports. */
  public readonly selected = computed(() => this.rovingSelected() || this.#hostSelected()());

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #hostSelected = signal<Signal<boolean>>(NOT_SELECTED);

  public constructor() {
    const button = inject(Button, { self: true, optional: true });
    this.enabled = computed(() => !this.rovingDisabled() && !(button?.disabled() ?? false));
  }

  /** Selected while `source` is true; for a host component, which can't bind its host directive's inputs. */
  public followSelected(source: Signal<boolean>): void {
    this.#hostSelected.set(source);
  }

  /** The element that takes focus: the host itself, or the first focusable element it renders. */
  public target(): HTMLElement {
    if (this.#host.matches(FOCUSABLE)) {
      return this.#host;
    }
    return this.#host.querySelector<HTMLElement>(FOCUSABLE) ?? this.#host;
  }
}
