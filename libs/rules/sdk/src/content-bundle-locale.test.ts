import { describe, expect, test } from 'bun:test';

import { ContentLocale, SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';

import { BundleFile, bundleLocale } from './content-bundle';
import { contentBundles } from './content-bundle-write';
import type { ContentBundles, LocaleTexts } from './content-bundle-write';
import { packContentsFromFiles } from './content-pack-file';
import { ContentText } from './content-text';
import { RichTextString } from './rich-text';
import {
  ancestry,
  bodyOf,
  bundles,
  common,
  contentIdOf,
  draconic,
  fetched,
  idOf,
  kindOf,
  lengthHash,
  localisedOf,
  onlyPack,
  packFile,
} from './testing/content-bundle-fixtures';

const GERMAN = ContentLocale.parse('de');

/** German text for the common language's name only; draconic has none, and neither has a German description. */
const germanNames: LocaleTexts = {
  locale: GERMAN,
  entries: new Map([[contentIdOf('language:common'), { name: ContentText.parse('Gemeinsprache') }]]),
};

/** German text for the common language's description. */
const germanDescription: LocaleTexts = {
  locale: GERMAN,
  entries: new Map([
    [
      contentIdOf('language:common'),
      {
        description: [
          { type: 'paragraph', content: [{ type: 'text', text: RichTextString.parse('Wird gesprochen.') }] },
        ],
      },
    ],
  ]),
};

function bundlesIn(texts: LocaleTexts): ContentBundles {
  return contentBundles([packContentsFromFiles(packFile, [[ancestry, common, draconic]])], lengthHash, texts);
}

describe('contentBundles in another locale', () => {
  test('names carry the locale and fall back to the entry’s own, marked untranslated', () => {
    const built = bundlesIn(germanNames);
    const { names } = kindOf(built, 'language');
    expect(names).toContain('.names.de.');
    expect(bodyOf(built, names)).toStrictEqual({
      [idOf('language:common')]: { name: 'Gemeinsprache' },
      [idOf('language:draconic')]: { name: 'Draconic', untranslated: true },
    });
  });

  test('the source locale’s names are never marked untranslated', () => {
    const built = bundles();
    const { names } = kindOf(built, 'language');
    expect(JSON.stringify(bodyOf(built, names))).not.toContain('untranslated');
  });

  test('descriptions carry the locale and fall back per entry, marked untranslated', () => {
    const built = bundlesIn(germanDescription);
    const { descriptions } = kindOf(built, 'language');
    expect(descriptions.every(({ file }) => file.includes('.desc.de.'))).toBe(true);
    const spoken = localisedOf(built, 'language', contentIdOf('language:common'));
    expect(spoken?.untranslated).toBe(false);
    expect(spoken?.text).toStrictEqual(germanDescription.entries.get(contentIdOf('language:common'))?.description);
  });

  test('an entry with no German description gets its own, marked untranslated, never blank', () => {
    const built = bundlesIn(germanDescription);
    const found = localisedOf(built, 'language', contentIdOf('language:draconic'));
    expect(found?.untranslated).toBe(true);
    expect(found?.text.length).toBeGreaterThan(0);
  });

  test('mechanics and the pack file are the same in every locale, so a switch fetches only text', () => {
    const english = onlyPack(bundles());
    const german = onlyPack(bundlesIn(germanNames));
    expect(german.file).toBe(english.file);
    expect(german.kinds.map(({ mechanics }) => mechanics)).toStrictEqual(
      english.kinds.map(({ mechanics }) => mechanics),
    );
    expect(german.kinds.map(({ names }) => names)).not.toStrictEqual(english.kinds.map(({ names }) => names));
  });

  test('the shards that exist do not depend on the locale', () => {
    const english = kindOf(bundles(), 'language').descriptions.map(({ shard }) => shard);
    const german = kindOf(bundlesIn(germanNames), 'language').descriptions.map(({ shard }) => shard);
    expect(german).toStrictEqual(english);
  });

  test('names read back as entries in the fetched locale', () => {
    const pack = fetched(bundlesIn(germanNames), ['language']);
    const names = pack.otherEntries.map((entry) => String(entry.name)).toSorted();
    expect(names).toStrictEqual(['Draconic', 'Gemeinsprache']);
  });
});

describe('bundleLocale', () => {
  test('is the locale a names or description file carries, and the source locale for any other', () => {
    const built = bundlesIn(germanNames);
    const kind = kindOf(built, 'language');
    expect(bundleLocale(kind.names)).toBe(GERMAN);
    expect(bundleLocale(BundleFile.parse('language.desc.de.a.0123456789abcdef.json'))).toBe(GERMAN);
    expect(bundleLocale(kind.mechanics)).toBe(SOURCE_CONTENT_LOCALE);
    expect(bundleLocale(onlyPack(built).file)).toBe(SOURCE_CONTENT_LOCALE);
  });
});
