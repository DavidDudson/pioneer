import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';

import { CharacterStore } from './data/character-store';

/** The open character's name for the breadcrumb trail; `undefined` until it loads. */
export function characterCrumb(): Signal<string | undefined> {
  const store = inject(CharacterStore);
  return computed(() => store.selected()?.name);
}
