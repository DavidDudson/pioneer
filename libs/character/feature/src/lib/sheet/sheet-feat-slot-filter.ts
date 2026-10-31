import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import { availableToYou, slotPrerequisiteStatus } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import {
  ContentId,
  ContentKind,
  facetCounts,
  facetsFor,
  filterEntries,
  prerequisitesMetFacet,
} from '@pioneer/rules/sdk';
import type {
  ContentRegistry,
  FacetCounts,
  FacetDefinition,
  FilterState,
  QueryParams,
  SlotKey,
} from '@pioneer/rules/sdk';

import { sheetEntry } from './sheet-entry-previews';
import {
  slotEverythingFromQuery,
  slotEverythingToQuery,
  slotFilterFromQuery,
  slotFilterToQuery,
} from './sheet-feat-filter';
import type { SheetFeatOption } from './sheet-feats';
import { sheetSlotContent } from './sheet-slot-content';

/** Where the feat pickers keep their filters: the URL's query params, read and changed. */
export interface FeatFilterSources {
  readonly params: Signal<QueryParams>;
  /** Sets the params named (`undefined` clears one), keeping the rest. */
  readonly write: (changes: Readonly<Record<string, string | undefined>>) => Promise<void>;
}

/** What a feat slot's filter panel shows and changes. */
export interface FeatSlotFilter {
  readonly state: Signal<FilterState>;
  readonly counts: Signal<readonly FacetCounts[]>;
  /** The slot's **Available to you** preset is in force: the player has no filters of their own yet. */
  readonly preset: Signal<boolean>;
  readonly everything: Signal<boolean>;
  /** The ids of the feats the filters leave out; a feat with no entry to filter is never among them. */
  readonly hidden: Signal<ReadonlySet<string>>;
  /** The player's filters replace the preset; with none left, the slot shows everything. */
  readonly apply: (state: FilterState) => Promise<void>;
  /** Shows everything, or goes back to the preset: either way the player's filters are dropped. */
  readonly showEverything: (on: boolean) => Promise<void>;
}

const FEAT_FACETS: readonly FacetDefinition[] = facetsFor([ContentKind.Feat]);

interface SlotReads {
  readonly registry: ContentRegistry;
  readonly character: Character;
}

/** What one slot's filter reads: the loaded content and character, the URL, and the feats the slot offers. */
export interface FeatSlotFilterInputs {
  readonly registry: Signal<ContentRegistry | undefined>;
  readonly character: Signal<Character | undefined>;
  readonly filters: FeatFilterSources;
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

/**
 * The filter of one feat slot's picker: it opens on **Available to you** for the character at that slot, whose every
 * facet the player can change, with a toggle that shows everything. The player's filters are in the URL under the
 * slot's own params, and so is the ask to show everything, so a filtered picker can be linked.
 */
export function featSlotFilter({ registry, character, filters, key, options }: FeatSlotFilterInputs): FeatSlotFilter {
  const reads: Signal<SlotReads | undefined> = computed(() => {
    const loaded = registry();
    const open = character();
    return loaded === undefined || open === undefined ? undefined : { registry: loaded, character: open };
  });
  const everything = computed(() => slotEverythingFromQuery(filters.params(), key));
  const facets = computed(() => facetsOf(reads(), key));
  const preset = computed(() => !everything() && slotFilterFromQuery(filters.params(), key, facets()).size === 0);
  const state: Signal<FilterState> = computed(() => {
    const read = reads();
    if (preset() && read !== undefined) {
      return availableToYou(read.character.document, sheetSlotContent(read.registry), key);
    }
    return slotFilterFromQuery(filters.params(), key, facets());
  });
  const entries = computed(() => {
    const read = reads();
    return read === undefined
      ? []
      : options().flatMap((option) => sheetEntry(read.registry, ContentId.parse(option.value)) ?? []);
  });
  const write = async (next: FilterState, all: boolean): Promise<void> => {
    await filters.write({ ...slotFilterToQuery(next, key, facets()), ...slotEverythingToQuery(key, all) });
  };
  return {
    state,
    counts: computed(() => facetCounts(entries(), facets(), state())),
    preset,
    everything,
    hidden: computed(() => {
      const kept = new Set<ContentId>(filterEntries(entries(), facets(), state()).map((entry) => entry.id));
      return new Set<string>(entries().flatMap((entry) => (kept.has(entry.id) ? [] : [entry.id])));
    }),
    apply: async (next) => {
      await write(next, next.size === 0);
    },
    showEverything: async (on) => {
      await write(new Map(), on);
    },
  };
}
