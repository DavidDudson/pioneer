import { effect, inject, untracked } from '@angular/core';
import type { SheetMode } from '@pioneer/character/domain';

import { CharacterStore } from '../data/character-store';

/**
 * Remembers `mode` as the open character's tab once the tab it last had is known, so opening a tab, by its link or
 * its URL, makes it the one the sheet reopens on. Call from a tab component's constructor.
 */
export function rememberTab(mode: SheetMode): void {
  const store = inject(CharacterStore);
  effect(() => {
    if (store.rememberedSheetMode() === undefined) {
      return;
    }
    untracked(() => {
      store.rememberSheetMode(mode);
    });
  });
}
