import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
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
