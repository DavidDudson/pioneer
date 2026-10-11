import { FOUNDRY_IMPORTS, foundryReleaseUrl } from '@pioneer/rules/catalog';
import type { BookLabel, PackId } from '@pioneer/rules/sdk';
import { bookTitle } from '@pioneer/rules/sdk';

/** One official pack as the Legal page lists it: its book's title key and the Foundry release it was imported from. */
export interface LegalImport {
  readonly pack: PackId;
  readonly titleKey: BookLabel;
  readonly release: string;
  readonly url: string;
}

/** Every pack imported from Foundry, in catalog order. */
export const LEGAL_IMPORTS: readonly LegalImport[] = FOUNDRY_IMPORTS.map((imported) => ({
  pack: imported.pack,
  titleKey: bookTitle(imported.book),
  release: imported.release,
  url: foundryReleaseUrl(imported),
}));
