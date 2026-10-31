import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import { availableToYou, slotPrerequisiteStatus } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { ContentKind, facetsFor, prerequisitesMetFacet } from '@pioneer/rules/sdk';
import type { ContentRegistry, FacetDefinition, FilterState, SlotKey } from '@pioneer/rules/sdk';

import type { SheetFeatOption } from './sheet-feats';
import { sheetSlotContent } from './sheet-slot-content';
import { slotFilter } from './sheet-slot-filter';
import type { FilterSources, SlotFilter } from './sheet-slot-filter';

const FEAT_FACETS: readonly FacetDefinition[] = facetsFor([ContentKind.Feat]);

interface SlotReads {
  readonly registry: ContentRegistry;
  readonly character: Character;
}

/** What one feat slot's filter reads: the loaded content and character, the URL, and the feats the slot offers. */
export interface FeatSlotFilterInputs {
  readonly registry: Signal<ContentRegistry | undefined>;
  readonly character: Signal<Character | undefined>;
  readonly filters: FilterSources;
  readonly key: SlotKey;
  readonly options: Signal<readonly SheetFeatOption[]>;
}

/** The facets the slot's feats are filtered by: the feat kind's, and prerequisites met as this character reads them. */
function facetsOf(read: SlotReads | undefined, key: SlotKey): readonly FacetDefinition[] {
  if (read === undefined) {
    return FEAT_FACETS;
  }
  const status = slotPrerequisiteStatus(read.character.document, sheetSlotContent(read.registry), key);
  return [...FEAT_FACETS, prerequisitesMetFacet(status)];
}

/** The filter of one feat slot's picker: it opens on **Available to you** for the character at that slot. */
export function featSlotFilter({ registry, character, filters, key, options }: FeatSlotFilterInputs): SlotFilter {
  const reads: Signal<SlotReads | undefined> = computed(() => {
    const loaded = registry();
    const open = character();
    return loaded === undefined || open === undefined ? undefined : { registry: loaded, character: open };
  });
  return slotFilter({
    registry,
    filters,
    key,
    offered: computed(() => options().map((option) => option.value)),
    facets: computed(() => facetsOf(reads(), key)),
    available: computed((): FilterState | undefined => {
      const read = reads();
      return read === undefined
        ? undefined
        : availableToYou(read.character.document, sheetSlotContent(read.registry), key);
    }),
  });
}
