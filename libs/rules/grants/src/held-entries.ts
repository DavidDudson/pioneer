import type { ContentId, ContentKind } from '@pioneer/rules/sdk';

import type { ContentLookup, GrantEntry } from './grant-entry';

/**
 * An entry a lookup holds until a read asks for it: a sheet reads a few hundred of the thousands of entries a registry
 * holds, and converting each (its facts, roll options and standing) is most of what building the lookup costs.
 */
export interface HeldEntry {
  readonly id: ContentId;
  readonly kind: ContentKind;
  /** The grant entry, built on the first call and kept; undefined for an entry grants do not read. */
  readonly read: () => GrantEntry | undefined;
}

/** A held entry that is built already. */
export function heldEntry(entry: GrantEntry): HeldEntry {
  return { id: entry.id, kind: entry.kind, read: (): GrantEntry => entry };
}

/** Where a lazy entry keeps what it built. */
interface LazyCell {
  built?: { readonly entry: GrantEntry | undefined };
}

/** A held entry built by `make` on its first read. */
export function lazyEntry(id: ContentId, kind: ContentKind, make: () => GrantEntry | undefined): HeldEntry {
  const cell: LazyCell = {};

  const read = (): GrantEntry | undefined => {
    cell.built ??= { entry: make() };

    return cell.built.entry;
  };

  return { id, kind, read };
}

/** The lookup over `entries`, by id and by kind. A later entry takes the id of an earlier one. */
export function lookupOf(entries: ReadonlyArray<HeldEntry>): ContentLookup {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const byKind = Map.groupBy(entries, (entry) => entry.kind);
  const kinds = new Map<ContentKind, ReadonlyArray<GrantEntry>>();

  return {
    entry: (id: ContentId): GrantEntry | undefined => byId.get(id)?.read(),
    ofKind: (kind: ContentKind): ReadonlyArray<GrantEntry> => {
      const read = kinds.get(kind) ?? (byKind.get(kind) ?? []).flatMap((entry) => entry.read() ?? []);
      kinds.set(kind, read);

      return read;
    },
  };
}
