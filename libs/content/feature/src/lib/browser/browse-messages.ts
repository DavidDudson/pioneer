import { computed, inject } from '@angular/core';
import type { Provider, Signal } from '@angular/core';
import type { BrowseRow } from '@pioneer/content/ui';
import { injectTranslate } from '@pioneer/frontier';
import { injectPropertyContext, PROPERTY_KINDS } from '@pioneer/frontier/data';
import type { TableColumn } from '@pioneer/frontier/data';
import { ContentKind } from '@pioneer/rules/sdk';
import { provideRulesPropertyKinds } from '@pioneer/rules/ui';

import { browseColumns, featBrowseColumns } from './browse-columns';
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
  const propertyKinds = inject(PROPERTY_KINDS);
  const context = injectPropertyContext();

  return computed(() => {
    const listed = kinds();

    if (listed.length === 1 && listed[0] === ContentKind.Feat) {
      return featBrowseColumns(true, { kinds: propertyKinds, context });
    }

    return browseColumns(
      listed.length === 1,
      listed.some((kind) => kind === ContentKind.Creature),
    );
  });
}

/** The property kinds the browser's columns are built from; provide it where `injectBrowseColumns` is called. */
export function provideBrowseKinds(): Provider {
  return provideRulesPropertyKinds();
}
