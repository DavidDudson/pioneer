import { inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { filter, merge } from 'rxjs';

/**
 * A signal that changes when the language changes or messages load, for words built with `translate`, which is not
 * reactive. Read it inside a `computed` to build the words again. Call in an injection context.
 */
export function injectTranslationChanges(): Signal<unknown> {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));

  return toSignal(merge(i18n.langChanges$, loaded));
}
