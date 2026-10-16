import { ContentKind } from '@pioneer/rules/sdk';
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

/** The packs' envelope entries of any of `kinds`, as lookup entries. */
function envelopeEntries(registry: ContentRegistry, ...kinds: readonly ContentKind[]): LookupEntry[] {
  return registry.packs.flatMap((pack) =>
    pack.otherEntries.flatMap((entry): LookupEntry[] => {
      if (!kinds.includes(entry.kind)) {
        return [];
      }
      const pathbuilder = entry.externalIds?.pathbuilder;
      const match: ContentMatch = { id: entry.id, name: entry.name };
      return [pathbuilder === undefined ? match : { ...match, externalIds: { pathbuilder } }];
    }),
  );
}

/** Every physical item kind; Pathbuilder doesn't tell them apart. */
const ITEM_KINDS = [
  ContentKind.Armor,
  ContentKind.Consumable,
  ContentKind.Equipment,
  ContentKind.Shield,
  ContentKind.Treasure,
  ContentKind.Weapon,
] as const;

/**
 * A lookup over the packs in a `ContentRegistry`: ancestries, and the heritages, backgrounds, classes, items, feats, spells,
 * rituals and class features the packs hold as envelope entries. Pathbuilder lists some heritages, ancestry features and actions
 * among a character's feats and class features, so those kinds answer for them too. Every other kind reports as not
 * loaded until content storage (Epic 2.3) indexes it.
 */
export function registryLookup(registry: ContentRegistry): ContentLookup {
  return entryLookup({
    [ImportKind.Ancestry]: registry.ancestries().map((entry) => ({ id: entry.id, name: entry.definition.name })),
    [ImportKind.Heritage]: envelopeEntries(registry, ContentKind.Heritage),
    [ImportKind.Background]: envelopeEntries(registry, ContentKind.Background),
    [ImportKind.Class]: envelopeEntries(registry, ContentKind.Class),
    [ImportKind.Feat]: envelopeEntries(registry, ContentKind.Feat, ContentKind.Heritage),
    [ImportKind.Language]: envelopeEntries(registry, ContentKind.Language),
    [ImportKind.Spell]: envelopeEntries(registry, ContentKind.Spell),
    [ImportKind.Ritual]: envelopeEntries(registry, ContentKind.Ritual),
    [ImportKind.Item]: envelopeEntries(registry, ...ITEM_KINDS),
    [ImportKind.ClassFeature]: envelopeEntries(
      registry,
      ContentKind.ClassFeature,
      ContentKind.AncestryFeature,
      ContentKind.Heritage,
      ContentKind.Action,
    ),
  });
}
