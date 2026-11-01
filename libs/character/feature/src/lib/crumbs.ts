import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

import { CharacterStore } from './data/character-store';
import { sectionPath, SHEET_PANELS, SHEET_TAB_SECTIONS } from './sheet/sheet-sections';

/** The open character's name for the breadcrumb trail; `undefined` until it loads. */
export function characterCrumb(): Signal<string | undefined> {
  const store = inject(CharacterStore);
  return computed(() => store.selected()?.name);
}

/** The name of the sheet section the route opens, `Identity` in `Characters / Aria / Plan / Identity`. */
export function sectionCrumb(route: ActivatedRouteSnapshot): Signal<string | undefined> {
  const i18n = inject(TranslocoService);
  const language = toSignal(i18n.langChanges$);
  const path = route.paramMap.get('section');
  const section = [...Object.values(SHEET_TAB_SECTIONS).flat(), ...SHEET_PANELS].find(
    (candidate) => sectionPath(candidate) === path,
  );
  return computed(() => {
    language();
    return section === undefined ? undefined : i18n.translate(section.headingKey);
  });
}
