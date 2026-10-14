import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { AttributeModifiers } from '@pioneer/rules/sdk';
import type { ClassPickerRow, KeyAttributePickerRow, SubclassPickerRow } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { classRows, keyAttributeRows, subclassRows } from '../data/class-rows';
import type { SheetState } from './sheet-state';

/** The rows of the class, subclass and key attribute pickers, over the content the sheet has loaded. */
export interface SheetClassRows {
  /** The content is still loading, so the pickers show their loading state. */
  readonly loading: Signal<boolean>;
  readonly classes: Signal<readonly ClassPickerRow[]>;
  readonly subclasses: Signal<readonly SubclassPickerRow[]>;
  readonly keyAttributes: Signal<readonly KeyAttributePickerRow[]>;
}

/** The class pickers' rows for `sheet`, read again when the language changes. Call in an injection context. */
export function injectClassRows(sheet: SheetState): SheetClassRows {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the rows' words are read again. */
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  const reads = { translate: (key: string, params?: object): string => i18n.translate(key, params) };
  return {
    loading: computed(() => sheet.registry.data() === undefined),
    classes: computed(() => {
      messages();
      const registry = sheet.registry.data();
      return registry === undefined ? [] : classRows(registry, sheet.character(), reads);
    }),
    subclasses: computed(() => {
      messages();
      const registry = sheet.registry.data();
      const character = sheet.character();
      const subclass = sheet.picks.subclass();
      return registry === undefined || character === undefined || subclass === undefined
        ? []
        : subclassRows(registry, character, { subclass, translate: reads.translate });
    }),
    keyAttributes: computed(() => {
      messages();
      const keyAttribute = sheet.picks.keyAttribute();
      return keyAttribute === undefined
        ? []
        : keyAttributeRows(keyAttribute, sheet.picks.attributes()?.modifiers ?? AttributeModifiers.none, reads);
    }),
  };
}
