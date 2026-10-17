import type { ContentId } from '@pioneer/rules/sdk';

import type { FoundryLinks } from './enricher-context';
import { FoundryItemType } from './foundry-document';
import type { FoundryPack, PackDocument } from './foundry-release';
import { foundrySlug } from './foundry-slug';
import type { SelectedEntry } from './select-entries';

/**
 * What description links resolve against. Foundry links an item by `Compendium.pf2e.<pack>.Item.<id>`, or by its
 * name in that place, and an action macro by the action's slug. Entries get their ids before any description is
 * translated, so a link to an entry later in the import resolves too.
 */

/** A selected document and the id its entry has. */
export interface LinkedEntry {
  readonly source: SelectedEntry;
  readonly id: ContentId;
}

/** `Compendium.pf2e.<pack>.Item.<document>`, where the document is its id or its name. */
export function itemUuid(pack: FoundryPack, document: string): string {
  return `Compendium.pf2e.${pack.name}.Item.${document}`;
}

/** `Compendium.pf2e.<pack>.Actor.<document>`: how Foundry names a creature of a bestiary pack. */
export function actorUuid(pack: FoundryPack, document: string): string {
  return `Compendium.pf2e.${pack.name}.Actor.${document}`;
}

function uuidsOf({ pack, document }: PackDocument): readonly string[] {
  const { _id: id, name } = document;
  return [itemUuid(pack, id), itemUuid(pack, name)];
}

function isAction({ document }: PackDocument): boolean {
  return document.type === FoundryItemType.Action;
}

interface Keyed<Value> {
  readonly document: PackDocument;
  readonly value: Value;
}

/** Each document's value by both its UUIDs; where two documents of one pack share a name, the first keeps it. */
function byUuid<Value>(keyed: readonly Keyed<Value>[]): ReadonlyMap<string, Value> {
  const map = new Map<string, Value>();
  for (const { document, value } of keyed) {
    for (const uuid of uuidsOf(document)) {
      map.set(uuid, map.get(uuid) ?? value);
    }
  }
  return map;
}

/** Each action's value by its Foundry slug. */
function bySlug<Value>(keyed: readonly Keyed<Value>[]): ReadonlyMap<string, Value> {
  return new Map(
    keyed
      .filter(({ document }) => isAction(document))
      .map(({ document, value }) => [foundrySlug(document.document), value]),
  );
}

/**
 * Links over a release's item documents (`documents`, for names of targets outside the import), the entries the
 * import makes (`entries`) and the entries of the other official packs by the UUIDs of the documents they were
 * imported from (`known`). An entry of this import wins a UUID both name.
 */
export function foundryLinks(
  documents: readonly PackDocument[],
  entries: readonly LinkedEntry[],
  known: ReadonlyMap<string, ContentId> = new Map(),
): FoundryLinks {
  const names = documents.map((document) => ({
    document,
    value: document.document.name,
  }));
  const books = documents.flatMap((document) => {
    const title = document.document.system.publication?.title;
    return title === undefined ? [] : [{ document, value: title }];
  });
  const ids = entries.map(({ source, id }) => ({
    document: source,
    value: id,
  }));
  return {
    entries: new Map([...known, ...byUuid(ids)]),
    names: byUuid(names),
    books: byUuid(books),
    actions: bySlug(ids),
    actionNames: bySlug(names),
  };
}
