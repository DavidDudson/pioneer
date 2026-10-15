import { contentId, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';

export interface Language {
  readonly slug: string;
  readonly name: string;
  /** Rules text; a language has none unless a test gives it one. */
  readonly text?: string;
}

export const COMMON: Language = { slug: 'common', name: 'Common' };
export const DRACONIC: Language = { slug: 'draconic', name: 'Draconic' };
export const ELVEN: Language = { slug: 'elven', name: 'Elven' };

function languageEntry(pack: string, { slug, name, text }: Language): object {
  return {
    id: contentId(PackId.parse(pack), EntrySlug.parse(`language:${slug}`)),
    pack,
    kind: 'language',
    slug: `language:${slug}`,
    name,
    rarity: 'common',
    traits: ['humanoid'],
    sources: [{ kind: 'book', book: 'player-core', page: 89 }],
    description: text === undefined ? [] : [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    rules: [],
    data: {},
  };
}

/** A pack of languages, as its JSON files would hold it. */
export function languagePack(pack: string, languages: readonly Language[]): PackContents {
  const packFile = { id: pack, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(packFile, [languages.map((language) => languageEntry(pack, language))]);
}

export function loader(contents: PackContents): PackContentsLoader {
  return { id: contents.file.id, load: async (): Promise<PackContents> => contents };
}
