import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { filter, merge, scan } from 'rxjs';

/** The values a message's placeholders take. */
export type TranslateParams = Readonly<Record<string, string | number>>;

/** A message in the active language: a key, and the values its placeholders take. */
export type Translate = (key: string, params?: TranslateParams) => string;

/**
 * `translate` for code that is not a template: a signal of a function that is new whenever the language changes or
 * messages finish loading, so a `computed` that calls it reads its messages again. Call in an injection context.
 */
export function injectTranslate(): Signal<Translate> {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const changes = toSignal(merge(i18n.langChanges$, loaded).pipe(scan((count) => count + 1, 0)), { initialValue: 0 });

  return computed(() => {
    changes();

    return (key, params) => i18n.translate(key, params);
  });
}
