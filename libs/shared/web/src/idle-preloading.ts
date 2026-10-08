import { inject, Injectable } from '@angular/core';
import type { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

import { IDLE_SCHEDULER } from './idle-scheduler';

/** Route `data` marking a lazy route as a likely next step, prefetched when idle. */
export const PREFETCH_WHEN_IDLE = { prefetch: true } as const;

/**
 * Preloads routes marked with {@link PREFETCH_WHEN_IDLE} once the browser is idle: their code
 * and, through `loadWithMessages`, their message scopes. Other routes load on navigation.
 */
@Injectable({ providedIn: 'root' })
export class IdlePreloading implements PreloadingStrategy {
  readonly #whenIdle = inject(IDLE_SCHEDULER);

  public preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['prefetch'] !== PREFETCH_WHEN_IDLE.prefetch) {
      return of(undefined);
    }
    return new Observable((subscriber) => {
      this.#whenIdle(() => {
        load().subscribe(subscriber);
      });
    });
  }
}
