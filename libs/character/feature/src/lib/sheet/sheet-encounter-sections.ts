import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { SheetMode } from '@pioneer/character/domain';

import { CharacterCompanionStore } from '../data/character-companion-store';
import { liveFamiliar } from './sheet-familiar';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS, shownSectionOf } from './sheet-sections';
import type { SheetSection } from './sheet-sections';

/** What the Encounter tab lays out: every section, the ones it lists in its section tabs, and the one the route names. */
export interface EncounterSections {
  readonly sections: typeof SHEET_SECTIONS;
  readonly order: Signal<ReadonlyArray<SheetSection>>;
  readonly shown: Signal<SheetSection | undefined>;
}

/**
 * The Encounter tab's sections. The Familiar section is listed only while the character has a familiar, so no tab is
 * empty. Call in an injection context.
 */
export function encounterSections(path: Signal<string | undefined>): EncounterSections {
  const companions = inject(CharacterCompanionStore);

  const order = computed((): ReadonlyArray<SheetSection> => {
    const hasFamiliar = liveFamiliar(companions.companions.data()?.companions ?? []) !== undefined;

    return SHEET_TAB_SECTIONS[SheetMode.Encounter].filter(
      (section) => hasFamiliar || section.anchor !== SHEET_SECTIONS.familiar.anchor,
    );
  });

  return { sections: SHEET_SECTIONS, order, shown: shownSectionOf(order, path) };
}
