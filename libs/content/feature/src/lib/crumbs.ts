import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

import { isBrowseKind, KIND_MESSAGES } from './browser/browse-kinds';
import { findEntry, kindOfParam } from './entry/entry-lookup';
import { injectEntryRegistry } from './entry/entry-registry';

/** The key for a kind the browser does not list (a condition): the list of kinds. */
const OTHER_KIND = 'content.kind.label';

/** The plural name of the entry's kind, `Spells` in `Content Browser / Spells / Fireball`. */
export function kindCrumb(route: ActivatedRouteSnapshot): Signal<string | undefined> {
  const i18n = inject(TranslocoService);
  const language = toSignal(i18n.langChanges$);
  const kind = kindOfParam(route.paramMap.get('kind'));
  const key = kind !== undefined && isBrowseKind(kind) ? KIND_MESSAGES[kind] : OTHER_KIND;
  return computed(() => {
    language();
    return i18n.translate(key);
  });
}

/** The entry's name, `Fireball` in `Content Browser / Spells / Fireball`; `undefined` until the registry loads. */
export function entryCrumb(route: ActivatedRouteSnapshot): Signal<string | undefined> {
  const i18n = inject(TranslocoService);
  const kind = kindOfParam(route.parent?.paramMap.get('kind'));
  const slug = route.paramMap.get('slug');
  const registry = injectEntryRegistry(() => kind);
  return computed(() => {
    const loaded = registry.data();
    if (loaded === undefined) {
      return registry.isError() ? i18n.translate('content.entry.missingTitle') : undefined;
    }
    const entry = kind === undefined ? undefined : findEntry(loaded, kind, slug);
    return entry?.name ?? i18n.translate('content.entry.missingTitle');
  });
}
