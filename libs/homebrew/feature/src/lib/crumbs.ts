import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

import { HomebrewStore } from './data/homebrew-store';

/** The open pack's title for the breadcrumb trail: `undefined` while it loads, the page's own title if it fails. */
export function packCrumb(): Signal<string | undefined> {
  const store = inject(HomebrewStore);
  const i18n = inject(TranslocoService);

  return computed(
    () =>
      store.selected.data()?.title ?? (store.selected.isError() ? i18n.translate('homebrew.pack.title') : undefined),
  );
}

/** The open entry's name for the breadcrumb trail: `undefined` while the list loads, the page's own title if it fails. */
export function entryCrumb(route: ActivatedRouteSnapshot): Signal<string | undefined> {
  const store = inject(HomebrewStore);
  const i18n = inject(TranslocoService);
  const wanted = route.paramMap.get('entryId');

  return computed(() => {
    const entries = store.entries.data();

    if (entries === undefined) {
      return store.entries.isError() ? i18n.translate('homebrew.entry.title') : undefined;
    }

    return entries.find((entry) => entry.id === wanted)?.name ?? i18n.translate('homebrew.entry.title');
  });
}
