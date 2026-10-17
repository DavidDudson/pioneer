import { inject } from '@angular/core';
import type { LinkTarget } from '@pioneer/frontier';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { entryTarget } from '@pioneer/rules/ui';
import type { EntryPreview, EntryPreviews } from '@pioneer/rules/ui';

/** Entries by registry: a loaded registry never changes, so each is indexed once. */
const ENTRIES = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, ContentEntry>>();

function entriesOf(registry: ContentRegistry): ReadonlyMap<ContentId, ContentEntry> {
  const indexed =
    ENTRIES.get(registry) ??
    new Map(registry.packs.flatMap((pack) => pack.otherEntries).map((entry) => [entry.id, entry]));
  ENTRIES.set(registry, indexed);
  return indexed;
}

/** The entry `id` names in a loaded registry, with all it carries; undefined when the registry doesn't hold it. */
export function sheetEntry(registry: ContentRegistry, id: ContentId): ContentEntry | undefined {
  return entriesOf(registry).get(id);
}

/**
 * What the sheet's references and rows preview of an entry: its name, level, traits, description and sources, read
 * from the loaded registry. An entry the registry doesn't hold, or a registry still loading, has no preview, so its
 * reference reads as it did.
 */
export function sheetEntryPreview(registry: ContentRegistry | undefined, id: ContentId): EntryPreview | undefined {
  const entry = registry === undefined ? undefined : sheetEntry(registry, id);
  return entry === undefined
    ? undefined
    : {
        name: entry.name,
        level: 'level' in entry ? entry.level : undefined,
        traits: entry.traits,
        summary: entry.description,
        sources: entry.sources,
      };
}

/**
 * The previews a container provides for its rows, read from the registry it has loaded; none while that is loading.
 *
 * ```ts
 * providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(Shop).previews }]
 * ```
 */
export function sheetEntryPreviews(registry: () => ContentRegistry | undefined): EntryPreviews {
  return { preview: (id) => sheetEntryPreview(registry(), id) };
}

/** The kinds the sheet's action, Strike, effect and condition rows name, so a card fetches these and no others. */
const FETCHED_PREVIEW_KINDS: readonly ContentKind[] = [
  ContentKind.Action,
  ContentKind.Condition,
  ContentKind.Effect,
  ContentKind.Weapon,
];

/**
 * The previews for the rows that name entries of those kinds (actions, Strikes, effects): from the registry the sheet
 * has loaded, and for an entry it doesn't hold, from the bundles of `kinds`, fetched when its card first opens and
 * kept for the next. Each card links to the entry's page, whether the sheet or the fetch holds the entry.
 */
export function sheetFetchingPreviews(
  registry: () => ContentRegistry | undefined,
  kinds: readonly ContentKind[] = FETCHED_PREVIEW_KINDS,
): EntryPreviews {
  const loader = inject(ContentLoader);
  const kept: { attempt: Promise<ContentRegistry> | undefined; fetched: ContentRegistry | undefined } = {
    attempt: undefined,
    fetched: undefined,
  };
  const fetchKinds = async (): Promise<ContentRegistry> => {
    kept.attempt ??= loader.registry(kinds);
    const { attempt } = kept;
    try {
      kept.fetched = await attempt;
      return kept.fetched;
    } catch (error) {
      // Only its own failure: a retry already under way is not this attempt's to forget.
      if (kept.attempt === attempt) {
        kept.attempt = undefined;
      }
      throw error;
    }
  };
  const target = (id: ContentId): LinkTarget | undefined => {
    const held = registry();
    const entry = (held === undefined ? undefined : sheetEntry(held, id)) ?? sheetEntryIn(kept.fetched, id);
    return entry === undefined ? undefined : entryTarget(entry);
  };
  return {
    ...sheetEntryPreviews(registry),
    load: async (id) => sheetEntryPreview(await fetchKinds(), id),
    target,
  };
}

function sheetEntryIn(registry: ContentRegistry | undefined, id: ContentId): ContentEntry | undefined {
  return registry === undefined ? undefined : sheetEntry(registry, id);
}
