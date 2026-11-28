import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { injectTranslate } from '@pioneer/frontier';
import type { AncestryPickerRow, BackgroundPickerRow, HeritagePickerRow } from '@pioneer/rules/ui';
import type { MessageParams } from '@pioneer/shared/kernel';

import { injectContentRegistry } from '../data/content-registry-query';
import { ancestryRows, backgroundRows, heritageRows } from '../data/origin-rows';
import { FEAT_CONTENT_KINDS } from './sheet-feats';
import type { SheetState } from './sheet-state';

/** The rows of the ancestry, heritage and background pickers, over the content the sheet has loaded. */
export interface SheetOriginRows {
  /** The content is still loading, so the pickers show their loading state. */
  readonly loading: Signal<boolean>;
  readonly ancestries: Signal<ReadonlyArray<AncestryPickerRow>>;
  readonly heritages: Signal<ReadonlyArray<HeritagePickerRow>>;
  readonly backgrounds: Signal<ReadonlyArray<BackgroundPickerRow>>;
}

/**
 * The origin pickers' rows for `sheet`, read again when the language changes. The backgrounds name the feat they grant
 * from the feats the Feats section loads, so they list it once those are in. Call in an injection context.
 */
export function injectOriginRows(sheet: SheetState): SheetOriginRows {
  const i18n = inject(TranslocoService);
  /** Changes when the language changes or the messages load, so the rows' words are read again. */
  const messages = injectTranslate();
  const feats = injectContentRegistry(FEAT_CONTENT_KINDS);
  const reads = { translate: (key: string, params?: MessageParams): string => i18n.translate(key, params) };

  return {
    loading: computed(() => sheet.registry.data() === undefined),
    ancestries: computed(() => {
      const registry = sheet.registry.data();

      return registry === undefined ? [] : ancestryRows(registry, sheet.character());
    }),
    heritages: computed(() => {
      messages();
      const registry = sheet.registry.data();
      const character = sheet.character();

      return registry === undefined || character === undefined ? [] : heritageRows(registry, character, reads);
    }),
    backgrounds: computed(() => {
      messages();
      const registry = feats.data() ?? sheet.registry.data();
      const character = sheet.character();

      return registry === undefined || character === undefined ? [] : backgroundRows(registry, character, reads);
    }),
  };
}
