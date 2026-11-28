import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { CLASS_SLOT, SECOND_CLASS_SLOT } from '@pioneer/character/domain';
import { injectTranslate } from '@pioneer/frontier';
import { AttributeModifiers } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import type { ClassPickerRow, KeyAttributePickerRow, SubclassPickerRow } from '@pioneer/rules/ui';
import type { MessageParams } from '@pioneer/shared/kernel';

import { classRows, keyAttributeRows, subclassRows } from '../data/class-rows';
import type { ClassPicks } from './sheet-build-picks';
import type { SheetState } from './sheet-state';

/** The rows of the class, subclass and key attribute pickers, over the content the sheet has loaded. */
export interface SheetClassRows {
  /** The content is still loading, so the pickers show their loading state. */
  readonly loading: Signal<boolean>;
  readonly classes: Signal<ReadonlyArray<ClassPickerRow>>;
  readonly subclasses: Signal<ReadonlyArray<SubclassPickerRow>>;
  readonly keyAttributes: Signal<ReadonlyArray<KeyAttributePickerRow>>;
}

/**
 * The class pickers' rows for `sheet`, read again when the language changes: the second class's when `second`. Call in
 * an injection context.
 */
export function injectClassRows(sheet: SheetState, second: () => boolean = () => false): SheetClassRows {
  const slot = (): SlotKey => (second() ? SECOND_CLASS_SLOT : CLASS_SLOT);
  const picks = (): ClassPicks => (second() ? sheet.picks.second : sheet.picks);
  const i18n = inject(TranslocoService);
  /** Changes when the language changes or the messages load, so the rows' words are read again. */
  const messages = injectTranslate();
  const reads = { translate: (key: string, params?: MessageParams): string => i18n.translate(key, params) };

  return {
    loading: computed(() => sheet.registry.data() === undefined),
    classes: computed(() => {
      messages();
      const registry = sheet.registry.data();

      return registry === undefined ? [] : classRows(registry, sheet.character(), { ...reads, slot: slot() });
    }),
    subclasses: computed(() => {
      messages();
      const registry = sheet.registry.data();
      const character = sheet.character();
      const subclass = picks().subclass();

      return registry === undefined || character === undefined || subclass === undefined
        ? []
        : subclassRows(registry, character, { subclass, translate: reads.translate });
    }),
    keyAttributes: computed(() => {
      messages();
      const keyAttribute = picks().keyAttribute();

      return keyAttribute === undefined
        ? []
        : keyAttributeRows(keyAttribute, sheet.picks.attributes()?.modifiers ?? AttributeModifiers.none, reads);
    }),
  };
}
