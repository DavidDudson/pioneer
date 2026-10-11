import { describe, expect, test } from 'bun:test';

import { BookId, ContentId, contentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { entryReferences, resolveUuid } from './entry-references';
import type { KnownEntry } from './entry-references';
import { entrySlugs } from './entry-slugs';
import { FoundryItemType } from './foundry-document';
import type { PackDocument } from './foundry-release';
import type { SelectedEntry } from './select-entries';

const DIVINE_MYSTERIES = PackId.parse('divine-mysteries');
const PLAYER_CORE = PackId.parse('player-core');
const DIVINE_MYSTERIES_BOOK = BookId.parse('divine-mysteries');

function document(pack: string, name: string, documentId: string): PackDocument {
  return {
    pack: { name: pack, directory: pack },
    path: `packs/pf2e/${pack}/${documentId}.json`,
    document: { _id: documentId, name, type: 'spell', img: 'icon.webp', system: { rules: [] } },
  };
}

function known(slug: string, foundry?: string): KnownEntry {
  const entrySlug = EntrySlug.parse(slug);
  return {
    id: ContentId.parse(contentId(PLAYER_CORE, entrySlug)),
    pack: PLAYER_CORE,
    kind: ContentKind.Spell,
    slug: entrySlug,
    ...(foundry === undefined ? {} : { foundry }),
  };
}

const uuid = (pack: string, idOrName: string): string => `Compendium.pf2e.${pack}.Item.${idOrName}`;

const heal = known('spell:heal', uuid('spells-srd', 'healId'));
const healDocument = document('spells-srd', 'Heal', 'healId');

describe('entryReferences', () => {
  test('resolves a release document an earlier import brought in to its entry, by id and by name', () => {
    const references = entryReferences(DIVINE_MYSTERIES, new Map(), { known: [heal], release: [healDocument] });

    expect(resolveUuid(references, uuid('spells-srd', 'healId'))).toBe(heal.id);
    expect(resolveUuid(references, uuid('spells-srd', 'Heal'))).toBe(heal.id);
  });

  test('never resolves a document to a known entry it was not imported from, whatever its name', () => {
    const glossary = document('bestiary-ability-glossary-srd', 'Heal', 'glossaryId');
    const references = entryReferences(DIVINE_MYSTERIES, new Map(), {
      known: [heal, known('spell:shield')],
      release: [glossary, document('spells-srd', 'Shield', 'shieldId')],
    });

    expect(resolveUuid(references, uuid('bestiary-ability-glossary-srd', 'Heal'))).toBeUndefined();
    expect(resolveUuid(references, uuid('spells-srd', 'Shield'))).toBeUndefined();
  });

  test("resolves the import's own document to its entry over a known one", () => {
    const own: SelectedEntry = { ...healDocument, type: FoundryItemType.Spell, book: DIVINE_MYSTERIES_BOOK };
    const references = entryReferences(DIVINE_MYSTERIES, entrySlugs([own]), { known: [heal], release: [healDocument] });
    const ownId = ContentId.parse(contentId(DIVINE_MYSTERIES, EntrySlug.parse('spell:heal')));

    expect(resolveUuid(references, uuid('spells-srd', 'healId'))).toBe(ownId);
  });
});
