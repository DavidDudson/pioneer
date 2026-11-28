import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import type { BrowseRow } from '@pioneer/content/ui';
import { injectTranslate } from '@pioneer/frontier';
import type { TableColumn } from '@pioneer/frontier/data';
import { ContentKind } from '@pioneer/rules/sdk';

import { browseColumns } from './browse-columns';
import type { BrowseKind } from './browse-kinds';

/**
 * A signal that changes when the messages load or the language changes, in an injection context. Read it in a
 * `computed` that translates, so a header or a kind is never a raw key.
 */
export function injectMessagesChanged(): Signal<unknown> {
  return injectTranslate();
}

/** The list's table columns in the UI language; the kind is hidden at first when the list holds one kind. */
export function injectBrowseColumns(
  kinds: () => ReadonlyArray<BrowseKind>,
): Signal<ReadonlyArray<TableColumn<BrowseRow>>> {
  return computed(() => {
    const listed = kinds();

    return browseColumns(
      listed.length === 1,
      listed.some((kind) => kind === ContentKind.Creature),
    );
  });
}
