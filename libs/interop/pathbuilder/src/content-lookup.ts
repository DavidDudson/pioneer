import type { ContentRegistry, ContentText, ExternalId } from '@pioneer/rules/sdk';
import type { Uuid } from '@pioneer/shared/kernel';

import { ImportKind, ImportKindSchema } from './import-kind';
import type { PathbuilderName } from './import-kind';

/** The content entry a Pathbuilder name resolved to. */
export interface ContentMatch {
  readonly id: Uuid;
  readonly name: ContentText;
}

/**
 * Where the importer finds content. A port, so the browser (loaded packs) and the API (stored content) can each
 * supply one, and kinds light up as content epics index them.
 */
export interface ContentLookup {
  /** Whether any content of this kind is loaded; names of an unsupported kind can't match. */
  supports: (kind: ImportKind) => boolean;
  resolve: (kind: ImportKind, name: PathbuilderName) => ContentMatch | undefined;
}

/** What a lookup indexes per entry. `externalIds.pathbuilder` holds Pathbuilder's name when it differs. */
export interface LookupEntry extends ContentMatch {
  readonly externalIds?: { readonly pathbuilder?: ExternalId };
}

/**
 * Name as compared: case, accents, apostrophes and punctuation ignored, so "Healing Potion (Moderate)" meets
 * "Healing Potion, Moderate" and "Nature’s Reprisal" meets "Nature's Reprisal".
 */
export function matchKey(name: string): string {
  return name
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .replaceAll(/['’‘`]/gu, '')
    .toLowerCase()
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

/** Index of one kind's entries: Pathbuilder ids (their names) win over our names when both match. */
class NameIndex {
  readonly #byExternal = new Map<string, ContentMatch>();
  readonly #byName = new Map<string, ContentMatch>();

  public constructor(entries: readonly LookupEntry[]) {
    for (const entry of entries) {
      const match: ContentMatch = { id: entry.id, name: entry.name };
      const external = entry.externalIds?.pathbuilder;
      if (external !== undefined) {
        this.#byExternal.set(matchKey(external), match);
      }
      this.#byName.set(matchKey(entry.name), match);
    }
  }

  public resolve(name: PathbuilderName): ContentMatch | undefined {
    const key = matchKey(name);
    return this.#byExternal.get(key) ?? this.#byName.get(key);
  }
}

/** A lookup over in-memory entries per kind; a kind left out is not loaded. */
export function entryLookup(entries: Partial<Record<ImportKind, readonly LookupEntry[]>>): ContentLookup {
  const indexes = new Map(
    Object.entries(entries).map(([kind, list]) => [ImportKindSchema.parse(kind), new NameIndex(list)] as const),
  );
  return {
    supports: (kind) => indexes.has(kind),
    resolve: (kind, name) => indexes.get(kind)?.resolve(name),
  };
}

/**
 * A lookup over the packs in a `ContentRegistry`. The registry indexes ancestries only until content storage
 * (Epic 2.3) moves packs onto the `ContentEntry` envelope; every other kind reports as not loaded.
 */
export function registryLookup(registry: ContentRegistry): ContentLookup {
  return entryLookup({
    [ImportKind.Ancestry]: registry.ancestries().map((entry) => ({ id: entry.id, name: entry.definition.name })),
  });
}
