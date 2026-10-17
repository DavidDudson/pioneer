import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { BrowseRow } from '@pioneer/content/ui';
import type { TableColumn } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import { browseColumns } from './browse-columns';
import type { BrowseKind } from './browse-kinds';

/**
 * A signal that changes when the messages load or the language changes, in an injection context. Read it in a
 * `computed` that translates, so a header or a kind is never a raw key.
 */
export function injectMessagesChanged(): Signal<unknown> {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  return toSignal(merge(i18n.langChanges$, loaded));
}

/** The list's table columns in the UI language; the kind is hidden at first when the list holds one kind. */
export function injectBrowseColumns(kinds: () => readonly BrowseKind[]): Signal<readonly TableColumn<BrowseRow>[]> {
  const i18n = inject(TranslocoService);
  const changed = injectMessagesChanged();
  return computed(() => {
    changed();
    return browseColumns((key) => i18n.translate(key), kinds().length === 1);
  });
}
