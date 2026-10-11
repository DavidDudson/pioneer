import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { InventoryItemId, ItemContent } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { containerOptions, LOOSE } from './sheet-inventory';

/**
 * Where an item can go, "Carried loose" first, then the open character's containers. Re-read when the messages load
 * or the language changes, as the ancestry options are, so the loose label is never a raw key. Call in an injection
 * context; `moving` is the item being moved, or undefined for a new one.
 */
export function injectPlaceOptions(
  content: Signal<ItemContent>,
  moving: Signal<InventoryItemId | undefined>,
): Signal<readonly SelectOption<string>[]> {
  const i18n = inject(TranslocoService);
  const store = inject(CharacterStore);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  return computed(() => {
    messages();
    const loose = { value: LOOSE, label: i18n.translate('character.sheet.inventory.loose') };
    const inventory = store.selected()?.document.inventory;
    return inventory === undefined ? [loose] : [loose, ...containerOptions(inventory, content(), moving())];
  });
}
