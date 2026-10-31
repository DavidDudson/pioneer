import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import { ContentId, facetCounts, filterEntries } from '@pioneer/rules/sdk';
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

/** Where the pickers keep their filters: the URL's query params, read and changed. */
export interface FilterSources {
  readonly params: Signal<QueryParams>;
  /** Sets the params named (`undefined` clears one), keeping the rest. */
  readonly write: (changes: Readonly<Record<string, string | undefined>>) => Promise<void>;
}

/** What a slot's filter panel shows and changes. */
export interface SlotFilter {
  readonly state: Signal<FilterState>;
  readonly counts: Signal<readonly FacetCounts[]>;
  /** The slot's **Available to you** preset is in force: the player has no filters of their own yet. */
  readonly preset: Signal<boolean>;
  readonly everything: Signal<boolean>;
  /** The ids of the entries the filters leave out; one with no entry to filter is never among them. */
  readonly hidden: Signal<ReadonlySet<string>>;
  /** The player's filters replace the preset; with none left, the slot shows everything. */
  readonly apply: (state: FilterState) => Promise<void>;
  /** Shows everything, or goes back to the preset: either way the player's filters are dropped. */
  readonly showEverything: (on: boolean) => Promise<void>;
}

/** What one slot's filter reads: the loaded content, the URL, the entries the slot offers, and its facets and preset. */
export interface SlotFilterInputs {
  readonly registry: Signal<ContentRegistry | undefined>;
  readonly filters: FilterSources;
  readonly key: SlotKey;
  /** The content ids of the entries the slot offers. */
  readonly offered: Signal<readonly string[]>;
  readonly facets: Signal<readonly FacetDefinition[]>;
  /** The slot's **Available to you** preset; undefined while what it reads loads, when the URL's filters stand. */
  readonly available: Signal<FilterState | undefined>;
}

/**
 * The filter of one slot's picker: it opens on the slot's **Available to you** preset, whose every facet the player can
 * change, with a toggle that shows everything. The player's filters are in the URL under the slot's own params, and so
 * is the ask to show everything, so a filtered picker can be linked.
 */
export function slotFilter({ registry, filters, key, offered, facets, available }: SlotFilterInputs): SlotFilter {
  const everything = computed(() => slotEverythingFromQuery(filters.params(), key));
  const preset = computed(() => !everything() && slotFilterFromQuery(filters.params(), key, facets()).size === 0);
  const state: Signal<FilterState> = computed(() => {
    const own = preset() ? available() : undefined;
    return own ?? slotFilterFromQuery(filters.params(), key, facets());
  });
  const entries = computed(() => {
    const loaded = registry();
    return loaded === undefined ? [] : offered().flatMap((id) => sheetEntry(loaded, ContentId.parse(id)) ?? []);
  });
  const write = async (next: FilterState, all: boolean): Promise<void> => {
    await filters.write({
      ...slotFilterToQuery(next, key, facets()),
      ...slotEverythingToQuery(key, all),
    });
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
