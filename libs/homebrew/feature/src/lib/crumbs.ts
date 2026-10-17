import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
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
