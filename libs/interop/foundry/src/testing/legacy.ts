import { BookId, ContentLicense, LegacyImport, Publisher } from '@pioneer/rules/sdk';
import type { Book } from '@pioneer/rules/sdk';

function legacyBook(id: string, legacy: LegacyImport): Book {
  return { id: BookId.parse(id), publisher: Publisher.Paizo, license: ContentLicense.Ogl, remaster: false, legacy };
}

/** The books the importer tests run with: one legacy book taken whole, one only for its listed entries. */
export const LEGACY: readonly Book[] = [
  legacyBook('mwangi-expanse', LegacyImport.Whole),
  legacyBook('advanced-players-guide', LegacyImport.Listed),
];
