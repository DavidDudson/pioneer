import { describe, expect, test } from 'bun:test';

import { BookId, ContentId, contentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { entryReferences, resolveUuid } from './entry-references';
import type { KnownEntry } from './entry-references';
import { entrySlugs } from './entry-slugs';
import { FoundryItemType } from './foundry-document';
import type { FoundryDocument } from './foundry-document';
import type { SelectedEntry } from './select-entries';

const DIVINE_MYSTERIES = PackId.parse('divine-mysteries');
const SPELLS = { name: 'spells-srd', directory: 'spells' };

function spell(name: string, book: string): SelectedEntry {
  const document = { _id: `${name}Id`, name, type: 'spell', img: 'icon.webp', system: { rules: [] } };
  return {
    pack: SPELLS,
    path: `packs/pf2e/spells/${name}.json`,
    document: document as unknown as FoundryDocument,
    type: FoundryItemType.Spell,
    book: BookId.parse(book),
  };
}

const heal: KnownEntry = {
  id: ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('spell:heal'))),
  pack: PackId.parse('player-core'),
  kind: ContentKind.Spell,
  slug: EntrySlug.parse('spell:heal'),
};

const uuid = (idOrName: string): string => `Compendium.pf2e.spells-srd.Item.${idOrName}`;

describe('entryReferences', () => {
  test("resolves another registered book's document to the known entry with its slug, by id and by name", () => {
    const references = entryReferences(DIVINE_MYSTERIES, new Map(), [heal], [spell('Heal', 'player-core')]);

    expect(resolveUuid(references, uuid('HealId'))).toBe(heal.id);
    expect(resolveUuid(references, uuid('Heal'))).toBe(heal.id);
  });

  test('leaves a document of another book unresolved when no known entry has its slug', () => {
    const references = entryReferences(DIVINE_MYSTERIES, new Map(), [heal], [spell('Protector Tree', 'player-core-2')]);

    expect(resolveUuid(references, uuid('Protector Tree'))).toBeUndefined();
  });

  test("resolves the import's own document to its entry over a known one", () => {
    const own = spell('Heal', 'divine-mysteries');
    const references = entryReferences(DIVINE_MYSTERIES, entrySlugs([own]), [heal], [spell('Heal', 'player-core')]);

    expect(resolveUuid(references, uuid('HealId'))).toBe(contentId(DIVINE_MYSTERIES, EntrySlug.parse('spell:heal')));
  });
});
