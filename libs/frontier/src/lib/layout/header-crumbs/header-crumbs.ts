import { computed, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import type { BreadcrumbItem } from '../../actions/breadcrumbs/breadcrumbs.component';

/**
 * The trail the shell's header shows. A page's `fr-page-header` works the trail out under the route's providers (a
 * crumb may inject the route's stores, which the shell cannot reach) and shows it here for as long as the page is on
 * screen. A page without a header leaves the trail empty.
 */
@Injectable({ providedIn: 'root' })
export class HeaderCrumbs {
  readonly #source = signal<Signal<readonly BreadcrumbItem[]> | undefined>(undefined);

  public readonly trail = computed<readonly BreadcrumbItem[]>(() => this.#source()?.() ?? []);

  /** Shows `trail` in the header until the returned function is called, unless a later page has taken over. */
  public show(trail: Signal<readonly BreadcrumbItem[]>): () => void {
    this.#source.set(trail);
    return (): void => {
      if (this.#source() === trail) {
        this.#source.set(undefined);
      }
    };
  }
}
