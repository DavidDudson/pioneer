import { ContentId, contentId, EntrySlug } from '@pioneer/rules/sdk';
import type { ContentKind, PackId } from '@pioneer/rules/sdk';

import { documentKind } from './entry-slugs';
import type { FoundryItemType } from './foundry-document';
import type { PackDocument } from './foundry-release';
import { asciiSlug } from './foundry-slug';
import type { SelectedEntry } from './select-entries';

/**
 * How the import turns Foundry's references to other documents into content ids. Foundry links an item by
 * compendium UUID, with the document's id or its name as the last part (`Compendium.pf2e.conditionitems.Item.Off-Guard`),
 * and conditions name the conditions they override by slug. Both resolve to the selected documents; the index also
 * knows the kind of every entry of the other official packs and the vocabulary.
 */

/** An entry of another official pack, or a vocabulary entry: what a reference may land on besides the documents. */
export interface KnownEntry {
  readonly id: ContentId;
  readonly pack: PackId;
  readonly kind: ContentKind;
  readonly slug: EntrySlug;
  /** The compendium UUID of the Foundry document it was imported from, by id; absent for a hand-authored entry. */
  readonly foundry?: string;
}

export interface EntryReferences {
  readonly byUuid: ReadonlyMap<string, ContentId>;
  /** Selected documents by Foundry type and Foundry slug. */
  readonly byFoundrySlug: ReadonlyMap<string, ContentId>;
  /** The kind of every id the index knows one for. */
  readonly kinds: ReadonlyMap<ContentId, ContentKind>;
  /**
   * Known entries and selected documents by entry slug (`language:dwarven`), for references Foundry makes by slug
   * alone. A document wins over a known entry with its slug, as the import replaces the target pack's entries.
   */
  readonly bySlug: ReadonlyMap<EntrySlug, ContentId>;
}

const COMPENDIUM = 'Compendium.pf2e.';

function compendiumKey(pack: string, idOrName: string): string {
  return `${COMPENDIUM}${pack}.Item.${idOrName}`;
}

function typedKey(type: string, slug: string): string {
  return `${type}\u0000${slug}`;
}

/** A selected document under the id its assigned slug gives it. */
interface Addressed {
  readonly entry: SelectedEntry;
  readonly slug: EntrySlug;
  readonly id: ContentId;
}

function addressed(pack: PackId, slugs: ReadonlyMap<SelectedEntry, string>): Addressed[] {
  return [...slugs].flatMap(([entry, text]) => {
    const slug = EntrySlug.safeParse(text);
    return slug.success ? [{ entry, slug: slug.data, id: ContentId.parse(contentId(pack, slug.data)) }] : [];
  });
}

/** Both UUIDs Foundry links a document by: its id and its name. */
function uuidsOf({ pack, document }: PackDocument, id: ContentId): [string, ContentId][] {
  const { _id: documentId, name } = document;
  return [
    [compendiumKey(pack.name, documentId), id],
    [compendiumKey(pack.name, name), id],
  ];
}

function kindOf({ entry, id }: Addressed): [ContentId, ContentKind] {
  return [id, documentKind(entry)];
}

/** What references may land on besides the import's own documents. */
export interface ReferenceSources {
  readonly known: readonly KnownEntry[];
  /** The release's item documents, for links to entries an earlier import made of them. */
  readonly release?: readonly PackDocument[];
}

/**
 * The UUIDs of the release documents a known entry was imported from, under that entry's id: a Divine Mysteries
 * deity's Player Core spells. A document matches by its compendium UUID alone, never by name or slug, so a Monster
 * Core ability never lands on a Player Core action of the same name.
 */
function knownUuids(release: readonly PackDocument[], known: readonly KnownEntry[]): [string, ContentId][] {
  const byFoundry = new Map(
    known.flatMap(({ foundry, id }) => (foundry === undefined ? [] : [[foundry, id] as const])),
  );
  return release.flatMap((each) => {
    const { _id: documentId } = each.document;
    const id = byFoundry.get(compendiumKey(each.pack.name, documentId));
    return id === undefined ? [] : uuidsOf(each, id);
  });
}

/**
 * The index for one import: each selected document under its compendium UUIDs and Foundry slug, given the slug it
 * was assigned (`entrySlugs`), and the kind of each known entry. A release document an earlier import brought in
 * resolves by UUID to that import's entry; one of this import wins a UUID both name. A document whose slug is not a
 * Pioneer slug has no id and is left out; translation reports it.
 */
export function entryReferences(
  pack: PackId,
  slugs: ReadonlyMap<SelectedEntry, string>,
  { known, release = [] }: ReferenceSources,
): EntryReferences {
  const documents = addressed(pack, slugs);
  return {
    byUuid: new Map([...knownUuids(release, known), ...documents.flatMap(({ entry, id }) => uuidsOf(entry, id))]),
    byFoundrySlug: new Map(documents.map(({ entry, id }) => [typedKey(entry.type, asciiSlug(entry.document)), id])),
    kinds: new Map([...documents.map((each) => kindOf(each)), ...known.map(({ id, kind }) => [id, kind] as const)]),
    bySlug: new Map([
      ...known.map(({ slug, id }) => [slug, id] as const),
      ...documents.map(({ slug, id }) => [slug, id] as const),
    ]),
  };
}

/** An index that resolves nothing, for translating entries on their own. */
export const NO_REFERENCES: EntryReferences = {
  byUuid: new Map(),
  byFoundrySlug: new Map(),
  kinds: new Map(),
  bySlug: new Map(),
};

/** The id of the known entry or selected document of `kind` with Foundry's slug (`language:dwarven`). */
export function resolveSlug(references: EntryReferences, kind: ContentKind, slug: string): ContentId | undefined {
  const parsed = EntrySlug.safeParse(`${kind}:${slug}`);
  return parsed.success ? references.bySlug.get(parsed.data) : undefined;
}

/** The id a compendium UUID names, if it is a selected document. */
export function resolveUuid(references: EntryReferences, uuid: string): ContentId | undefined {
  return references.byUuid.get(uuid);
}

/** The id of the selected document of a Foundry type with a Foundry slug (a condition's `overrides`). */
export function resolveFoundrySlug(
  references: EntryReferences,
  type: FoundryItemType,
  slug: string,
): ContentId | undefined {
  return references.byFoundrySlug.get(typedKey(type, slug));
}
