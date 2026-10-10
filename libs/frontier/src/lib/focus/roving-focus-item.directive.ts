import { booleanAttribute, Directive, ElementRef, inject, input } from '@angular/core';

/** Elements that take focus without a `tabindex`, or already have one; an item focuses the first of these it holds. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

/**
 * One stop in a `[frRovingFocus]` group. Put it on the element to focus or on a host that renders it: on
 * `fr-button` it finds the native `<button>` inside.
 */
@Directive({ selector: '[frRovingFocusItem]' })
export class RovingFocusItem {
  /** Holds the group's tab stop until focus has been inside the group, e.g. the chosen option. */
  public readonly rovingSelected = input(false, { transform: booleanAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The element that takes focus: the host itself, or the first focusable element it renders. */
  public target(): HTMLElement {
    if (this.#host.matches(FOCUSABLE)) {
      return this.#host;
    }
    return this.#host.querySelector<HTMLElement>(FOCUSABLE) ?? this.#host;
  }

  /** A disabled control can't take focus, so the group skips it. */
  public enabled(): boolean {
    return !this.target().matches(':disabled');
  }
}
