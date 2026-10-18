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
