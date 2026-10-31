import { computed, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import { BoxWidth } from '../box/box.component';

/**
 * The width the shell's header and footer take: the width of the page on screen, so the brand and the account menu
 * sit at the edges of the page's own content. An `fr-page` shows its width here for as long as it is on screen; with
 * no page, or a page that sets none, the header and footer keep the page width.
 */
@Injectable({ providedIn: 'root' })
export class ShellWidth {
  readonly #source = signal<Signal<BoxWidth> | undefined>(undefined);

  public readonly current = computed<BoxWidth>(() => this.#source()?.() ?? BoxWidth.Page);

  /** Shows `width` in the shell until the returned function is called, unless a later page has taken over. */
  public show(width: Signal<BoxWidth>): () => void {
    this.#source.set(width);
    return (): void => {
      if (this.#source() === width) {
        this.#source.set(undefined);
      }
    };
  }
}
