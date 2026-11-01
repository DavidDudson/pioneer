import { inject } from '@angular/core';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { EntryPreviews } from '@pioneer/rules/ui';

import { sheetEntryPreviews } from './sheet-entry-previews';
import { SheetState } from './sheet-state';

/**
 * The previews a section provides for its rows, read from the registry it has loaded (`sheetEntryPreviews`), with a
 * condition the character has previewing as it applies, its value and effects, when the section sits in a sheet.
 * Call it in an injection context.
 */
export function sheetSectionPreviews(registry: () => ContentRegistry | undefined): EntryPreviews {
  const own = sheetEntryPreviews(registry);
  return inject(SheetState, { optional: true })?.withConditions(own) ?? own;
}
