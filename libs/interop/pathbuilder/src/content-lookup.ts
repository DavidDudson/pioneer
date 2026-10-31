import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentRegistry, ContentText, ExternalId } from '@pioneer/rules/sdk';
import type { Uuid } from '@pioneer/shared/kernel';

import { ImportKind, ImportKindSchema } from './import-kind';
import type { PathbuilderName } from './import-kind';
import { LEGACY_ITEM_NAMES } from './legacy-names';

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

/** Shortest name a typo is forgiven in; below this, one edit often makes a different word. */
const MIN_FUZZY_LENGTH = 10;

/** Pre-remaster names per kind, as match keys: legacy key to remaster key. */
const LEGACY_KEYS: Partial<Record<ImportKind, ReadonlyMap<string, string>>> = {
  [ImportKind.Item]: new Map(LEGACY_ITEM_NAMES.map(([legacy, remaster]) => [matchKey(legacy), matchKey(remaster)])),
};

function digitsOf(key: string): string {
  return key.replaceAll(/\D/gu, '');
}

/** Whether `left` becomes `right` by one insertion, deletion, substitution or swap of neighbours. */
function withinOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) {
    start += 1;
  }
  const first = left.slice(start);
  const second = right.slice(start);
  if (first.length === second.length) {
    const swapped =
      first.length > 1 &&
      first.startsWith(`${second.charAt(1)}${second.charAt(0)}`) &&
      first.slice(2) === second.slice(2);
    return first.slice(1) === second.slice(1) || swapped;
  }
  const [long, short] = first.length > second.length ? [first, second] : [second, first];
  return long.slice(1) === short;
}

/**
 * Index of one kind's entries: Pathbuilder ids (their names) win over our names when both match, then pre-remaster
 * names, then a lone name one typo away.
 */
class NameIndex {
  readonly #byExternal = new Map<string, ContentMatch>();
  readonly #byName = new Map<string, ContentMatch>();
  readonly #legacy: ReadonlyMap<string, string>;

  public constructor(entries: readonly LookupEntry[], legacy: ReadonlyMap<string, string> = new Map()) {
    this.#legacy = legacy;
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
    return this.#exact(key) ?? this.#exact(this.#legacy.get(key)) ?? this.#nearby(key);
  }

  #exact(key: string | undefined): ContentMatch | undefined {
    return key === undefined ? undefined : (this.#byExternal.get(key) ?? this.#byName.get(key));
  }

  /** The only entry one edit from `key` with the same numbers (+1 is not +2); nothing when none or several. */
  #nearby(key: string): ContentMatch | undefined {
    if (key.length < MIN_FUZZY_LENGTH) {
      return undefined;
    }
    const digits = digitsOf(key);
    const near = [...this.#byExternal, ...this.#byName].filter(
      ([candidate]) => digitsOf(candidate) === digits && withinOneEdit(key, candidate),
    );
    const [only] = near;
    return only !== undefined && near.every(([, match]) => match.id === only[1].id) ? only[1] : undefined;
  }
}

/** A lookup over in-memory entries per kind; a kind left out is not loaded. */
export function entryLookup(entries: Partial<Record<ImportKind, readonly LookupEntry[]>>): ContentLookup {
  const indexes = new Map(
    Object.entries(entries).map(
      ([kind, list]) =>
        [ImportKindSchema.parse(kind), new NameIndex(list, LEGACY_KEYS[ImportKindSchema.parse(kind)])] as const,
    ),
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
