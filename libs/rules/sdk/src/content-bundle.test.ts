import { describe, expect, test } from 'bun:test';

import { BundleHash, bundlePath, contentBundles, contentPackFromBundles } from './content-bundle';
import type { BundleBody, CanonicalJson, BundleFile, ContentBundles, KindBundles, PackBundles } from './content-bundle';
import { contentId, EntrySlug, PackId } from './content-id';
import type { ContentPack } from './content-pack';
import { contentPackFromFiles, packContentsFromFiles } from './content-pack-file';

const PACK = PackId.parse('homebrew');
const idOf = (slug: string): string => contentId(PACK, EntrySlug.parse(slug));
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };

/** A hasher that names a bundle by its length, so tests can predict file names. */
function lengthHash(json: CanonicalJson): BundleHash {
  return BundleHash.parse(json.length.toString(16).padStart(16, '0'));
}

/** A language entry; `slug` is its name, or a whole slug for a fixture that changes the kind. */
function language(slug: string, name: string): object {
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
    const pack = onlyPack(built);
    const named = [pack.file, ...pack.kinds.flatMap((kind) => [kind.mechanics, kind.names])];
    expect([...built.bodies.keys()].toSorted()).toStrictEqual(named.map((file) => bundlePath(PACK, file)).toSorted());
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

describe('contentPackFromBundles', () => {
  test('reads back the definitions the files give', () => {
    const fromFiles = contentPackFromFiles(packFile, [[ancestry, common, draconic]]);
    const fromBundles = fetched(bundles(), ['ancestry', 'language']);
    expect(fromBundles.manifest).toStrictEqual(fromFiles.manifest);
    expect(fromBundles.ancestries).toStrictEqual(fromFiles.ancestries);
    expect(fromBundles.otherEntries.map((entry) => String(entry.name))).toStrictEqual(['Common', 'Draconic']);
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
