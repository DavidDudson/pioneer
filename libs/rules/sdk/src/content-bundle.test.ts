import { describe, expect, test } from 'bun:test';

import { ContentLocale, SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';

import {
  BundleFile,
  BundleHash,
  bundleLocale,
  bundlePath,
  ByteCount,
  canonicalJson,
  contentPackFromBundles,
  descriptionFromBundle,
  descriptionShard,
  PackBundles,
} from './content-bundle';
import type { BundleBody, CanonicalJson, KindBundles, LocalisedDescription } from './content-bundle';
import { contentBundles } from './content-bundle-write';
import type { ContentBundles, LocaleTexts } from './content-bundle-write';
import { ContentId, contentId, EntrySlug, PackId } from './content-id';
import type { ContentPack } from './content-pack';
import { contentPackFromFiles, packContentsFromFiles } from './content-pack-file';
import { ContentText } from './content-text';
import { RichTextString } from './rich-text';
import type { RichText } from './rich-text';

const PACK = PackId.parse('homebrew');
const idOf = (slug: string): string => contentId(PACK, EntrySlug.parse(slug));
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };

/** A hasher that names a bundle by its length, so tests can predict file names. */
function lengthHash(json: CanonicalJson): BundleHash {
  return BundleHash.parse(json.length.toString(16).padStart(16, '0'));
}

/** A language entry as JSON. */
interface LanguageFixture {
  readonly id: string;
  readonly pack: string;
  readonly kind: string;
  readonly slug: string;
  readonly name: string;
  readonly rarity: string;
  readonly traits: readonly string[];
  readonly sources: readonly unknown[];
  readonly description: readonly unknown[];
  readonly rules: readonly unknown[];
  readonly data: object;
}

/** A language entry; `slug` is its name, or a whole slug for a fixture that changes the kind. */
function language(slug: string, name: string): LanguageFixture {
  const full = slug.includes(':') ? slug : `language:${slug}`;

  return {
    id: idOf(full),
    pack: PACK,
    kind: 'language',
    slug: full,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 89 }],
    description: [{ type: 'paragraph', content: [{ type: 'text', text: `${name} is spoken.` }] }],
    rules: [],
    data: {},
  };
}

const ancestry = {
  ...language('ancestry:lizardfolk', 'Lizardfolk'),
  kind: 'ancestry',
  traits: ['humanoid', 'lizardfolk'],
  data: {
    hitPoints: 8,
    size: 'medium',
    speed: 25,
    boosts: [['str'], ['wis']],
    flaws: ['int'],
    languages: [idOf('language:common')],
    additionalLanguages: { count: 0, options: [] },
    reach: 5,
  },
};

const common = language('common', 'Common');
const draconic = language('draconic', 'Draconic');

function bundles(entries: readonly object[] = [ancestry, common, draconic]): ContentBundles {
  return contentBundles([packContentsFromFiles(packFile, [entries])], lengthHash);
}

function onlyPack({ manifest }: ContentBundles): PackBundles {
  const [pack] = manifest.packs;

  if (pack === undefined) {
    throw new Error('Expected one pack in the manifest');
  }

  return pack;
}

/** The bundles of `kind` in the only pack. */
function kindOf(built: ContentBundles, kind: string): KindBundles {
  const found = onlyPack(built).kinds.find((bundled) => bundled.kind === kind);

  if (found === undefined) {
    throw new Error(`Expected ${kind} in the manifest`);
  }

  return found;
}

function bodyOf(built: ContentBundles, file: BundleFile): BundleBody {
  const found = built.bodies.get(bundlePath(PACK, file));

  if (found === undefined) {
    throw new Error(`Expected a body for ${file}`);
  }

  return found;
}

function fetched(built: ContentBundles, kinds: readonly string[]): ContentPack {
  const pack = onlyPack(built);

  return contentPackFromBundles(
    bodyOf(built, pack.file),
    kinds.map((kind) => ({
      mechanics: bodyOf(built, kindOf(built, kind).mechanics),
      names: bodyOf(built, kindOf(built, kind).names),
    })),
  );
}

const contentIdOf = (slug: string): ContentId => ContentId.parse(idOf(slug));

/** Every file a pack's manifest names. */
function filesOf(pack: PackBundles): readonly BundleFile[] {
  const kinds = pack.kinds.flatMap((kind) =>
    [kind.mechanics, kind.names, kind.descriptions.map(({ file }) => file)].flat(),
  );

  return [pack.file, ...kinds];
}

/** `id`'s description with its `untranslated` mark, as the bundles give it. */
function localisedOf(built: ContentBundles, kind: string, id: ContentId): LocalisedDescription | undefined {
  const shard = kindOf(built, kind).descriptions.find((each) => each.shard === descriptionShard(id));

  return shard === undefined ? undefined : descriptionFromBundle(bodyOf(built, shard.file), id);
}

/** `id`'s description as the bundles give it: undefined when its shard does not exist or does not hold it. */
function descriptionOf(built: ContentBundles, kind: string, id: ContentId): RichText | undefined {
  const shard = kindOf(built, kind).descriptions.find((each) => each.shard === descriptionShard(id));

  return shard === undefined ? undefined : descriptionFromBundle(bodyOf(built, shard.file), id)?.text;
}

describe('contentBundles', () => {
  test('names a pack file and, per kind in kind order, a mechanics and a names bundle', () => {
    const built = bundles();
    const pack = onlyPack(built);
    expect(pack.id).toBe(PACK);
    expect(pack.file).toMatch(/^pack\.[\da-f]{16}\.json$/u);
    expect(pack.kinds.map((kind) => kind.kind)).toStrictEqual(['ancestry', 'language']);
    expect(kindOf(built, 'language').mechanics).toMatch(/^language\.mech\.[\da-f]{16}\.json$/u);
    expect(kindOf(built, 'language').names).toMatch(/^language\.names\.en\.[\da-f]{16}\.json$/u);
  });

  test('holds a body for every file the manifest names, and no other', () => {
    const built = bundles();
    const named = filesOf(onlyPack(built)).map((file) => bundlePath(PACK, file));
    expect([...built.bodies.keys()].toSorted()).toStrictEqual(named.toSorted());
  });

  test('mechanics leave out names and descriptions, sorted by id', () => {
    const built = bundles();
    const mechanics = bodyOf(built, kindOf(built, 'language').mechanics);
    const sortedIds = [idOf('language:common'), idOf('language:draconic')].toSorted();
    expect(mechanics).toMatchObject(sortedIds.map((id) => ({ id, kind: 'language' })));
    expect(JSON.stringify(mechanics)).not.toContain('Common');
    expect(JSON.stringify(mechanics)).not.toContain('description');
  });

  test('names map each id to its name', () => {
    const built = bundles();
    const names = bodyOf(built, kindOf(built, 'language').names);
    expect(names).toStrictEqual({
      [idOf('language:common')]: { name: 'Common' },
      [idOf('language:draconic')]: { name: 'Draconic' },
    });
  });

  test('descriptions are sharded by id prefix, one bundle per shard in use', () => {
    const { descriptions } = kindOf(bundles(), 'language');
    const ids = [contentIdOf('language:common'), contentIdOf('language:draconic')];
    const shards = new Set(ids.map((id) => descriptionShard(id)));
    expect(descriptions.map(({ shard }) => shard)).toStrictEqual([...shards].toSorted());
    const stems = descriptions.map(({ file }) => file.replace(/\.[\da-f]{16}\.json$/u, ''));
    expect(stems).toStrictEqual(descriptions.map(({ shard }) => `language.desc.en.${shard}`));
  });

  test('a shard maps the ids in it to their descriptions', () => {
    const description = descriptionOf(bundles(), 'language', contentIdOf('language:common'));
    expect(description).toStrictEqual([
      { type: 'paragraph', content: [{ type: 'text', text: RichTextString.parse('Common is spoken.') }] },
    ]);
  });

  test('an entry without a description is in no shard', () => {
    const silent = { ...language('draconic', 'Draconic'), description: [] };
    const built = bundles([ancestry, common, silent]);
    expect(descriptionOf(built, 'language', contentIdOf('language:draconic'))).toBeUndefined();
    expect(descriptionOf(built, 'language', contentIdOf('language:common'))).toBeDefined();
  });

  test('a kind none of whose entries has a description has no description bundles', () => {
    const silent = { ...language('draconic', 'Draconic'), description: [] };
    expect(kindOf(bundles([silent]), 'language').descriptions).toStrictEqual([]);
  });

  test('a changed description changes only its shard', () => {
    const before = bundles();

    const reworded = {
      ...language('draconic', 'Draconic'),
      description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dragons speak it.' }] }],
    };

    const after = bundles([ancestry, common, reworded]);
    const [was, now] = [kindOf(before, 'language'), kindOf(after, 'language')];
    expect(now.mechanics).toBe(was.mechanics);
    expect(now.names).toBe(was.names);
    const changed = now.descriptions.filter(({ file }, index) => file !== was.descriptions[index]?.file);
    const draconicShard = descriptionShard(contentIdOf('language:draconic'));
    expect(changed.map(({ shard }) => shard)).toStrictEqual([draconicShard]);
  });

  test('a reordered file gives the same bundles', () => {
    expect(bundles([draconic, common, ancestry])).toStrictEqual(bundles());
  });

  test('a changed name changes only that kind’s names bundle', () => {
    const before = bundles();
    const after = bundles([ancestry, common, language('draconic', 'Dragon')]);
    expect(onlyPack(after).file).toBe(onlyPack(before).file);
    expect(kindOf(after, 'ancestry')).toStrictEqual(kindOf(before, 'ancestry'));
    expect(kindOf(after, 'language').mechanics).toBe(kindOf(before, 'language').mechanics);
    expect(kindOf(after, 'language').names).not.toBe(kindOf(before, 'language').names);
  });
});

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

describe('contentPackFromBundles', () => {
  test('reads back the definitions the files give', () => {
    const fromFiles = contentPackFromFiles(packFile, [[ancestry, common, draconic]]);
    const fromBundles = fetched(bundles(), ['ancestry', 'language']);
    expect(fromBundles.manifest).toStrictEqual(fromFiles.manifest);
    expect(fromBundles.ancestries).toStrictEqual(fromFiles.ancestries);
    expect(fromBundles.otherEntries.map((entry) => String(entry.name))).toStrictEqual(['Common', 'Draconic']);
  });

  test('entries come back as the checked files give them, without being checked again', () => {
    const checked = contentPackFromFiles(packFile, [
      [ancestry, { ...common, description: [] }, { ...draconic, description: [] }],
    ]);

    const fromBundles = fetched(bundles(), ['ancestry', 'language']);
    expect(fromBundles.otherEntries).toStrictEqual(checked.otherEntries);
  });

  test('holds only the kinds fetched', () => {
    const pack = fetched(bundles(), ['ancestry']);
    expect(pack.ancestries).toHaveLength(1);
    expect(pack.otherEntries).toHaveLength(0);
  });

  test('an entry with no name is refused', () => {
    const built = bundles();
    const { file } = onlyPack(built);
    const { mechanics } = kindOf(built, 'language');
    const unnamed = [{ mechanics: bodyOf(built, mechanics), names: {} }];
    expect(() => contentPackFromBundles(bodyOf(built, file), unnamed)).toThrow(
      `No name for content entry ${idOf('language:common')}`,
    );
  });
});

describe('descriptionFromBundle', () => {
  test('is undefined for an id the shard does not hold', () => {
    expect(descriptionFromBundle({}, contentIdOf('language:common'))).toBeUndefined();
  });

  test('refuses a shard that is not descriptions', () => {
    const shard = { [idOf('language:common')]: 'text' };
    expect(() => descriptionFromBundle(shard, contentIdOf('language:common'))).toThrow();
  });
});

/** The sizes a pack's manifest entry lists, by file. */
function sizesOf(pack: PackBundles): Record<string, ByteCount> {
  if (pack.sizes === undefined) {
    throw new Error('Expected sizes in the manifest');
  }

  return pack.sizes;
}

describe('manifest sizes', () => {
  test('sizes every file the manifest names, as the bytes served', () => {
    const built = bundles();
    const pack = onlyPack(built);
    const files = filesOf(pack);

    const served = files.map((file) => {
      const json = canonicalJson(bodyOf(built, file));

      return ByteCount.parse(new TextEncoder().encode(json).length);
    });

    expect(Object.keys(sizesOf(pack)).toSorted()).toEqual([...files].toSorted());
    expect(files.map((file) => sizesOf(pack)[file])).toEqual(served);
  });

  test('still reads a manifest from a build that had no sizes', () => {
    const { sizes: _sizes, ...older } = onlyPack(bundles());
    expect(PackBundles.parse(older)).toEqual(older);
  });
});
