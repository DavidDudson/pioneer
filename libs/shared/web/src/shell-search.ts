import { computed, Injectable, signal } from '@angular/core';

const NONE = 0;
const ONE = 1;

/**
 * Whether the shell shows its global content search. A page that has a search of its own, in a docked panel, hides the
 * shell's while it is on screen, so the shortcut and the box are never twice on a page.
 */
@Injectable({ providedIn: 'root' })
export class ShellSearch {
  readonly #hiders = signal(NONE);

  public readonly hidden = computed(() => this.#hiders() > NONE);

  readonly #focusRequests = signal(NONE);

  /** Counts the times the page's own search was asked for the cursor, so asking again is a change to react to. */
  public readonly focusRequests = this.#focusRequests.asReadonly();

  /** Asks the page's own search, wherever it is, to take the cursor. */
  public requestFocus(): void {
    this.#focusRequests.update((count) => count + ONE);
  }

  /** Hides the shell's search until the returned function is called, which does nothing the second time. */
  public hide(): () => void {
    this.#hiders.update((count) => count + ONE);
    let released = false;
    return (): void => {
      if (!released) {
        released = true;
        this.#hiders.update((count) => count - ONE);
      }
    };
  }
}
