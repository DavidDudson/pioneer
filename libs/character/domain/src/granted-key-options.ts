import { resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, RootSlotDefinition } from '@pioneer/rules/grants';
import { ContentKind, Level, SlotKey } from '@pioneer/rules/sdk';
import type { Attribute, ContentEntry, ContentRegistry } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MIN } from './character-fields';

const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);

/** What a character's key attribute options are read from. */
interface KeyOptionSources {
  readonly registry: ContentRegistry;
  readonly entries: readonly ContentEntry[];
  readonly rootSlots: readonly RootSlotDefinition[];
  /** The grant lookup, read when the first document is, so a registry with no such feature never builds one. */
  readonly lookup: () => ContentLookup;
}

/**
 * What the character's class features add to its key attribute options, read from its grants at 1st level, when the
 * class picks its key attribute: a racket a rogue picks there widens it. Each document is read once.
 */
export function grantedKeyOptions({
  registry,
  entries,
  rootSlots,
  lookup,
}: KeyOptionSources): (document: CharacterDocument) => readonly Attribute[] {
  const options = new Map(
    entries.flatMap((entry) =>
      entry.kind === ContentKind.ClassFeature && entry.data.keyAttributeOptions !== undefined
        ? [[entry.id, entry.data.keyAttributeOptions] as const]
        : [],
    ),
  );
  if (options.size === 0) {
    return () => [];
  }
  const read = new WeakMap<CharacterDocument, readonly Attribute[]>();
  return (document) => {
    const known = read.get(document);
    if (known !== undefined) {
      return known;
    }
    const { items } = resolveGrants({
      roots: [],
      lookup: lookup(),
      level: FIRST_LEVEL,
      situation: [],
      picks: new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value])),
      rootSlots,
      toggles: new Map(),
      namespaces: registry.rollOptionNamespaces(),
    });
    const added = items.flatMap(({ entry }) => options.get(entry.id) ?? []);
    read.set(document, added);
    return added;
  };
}
