import { describe, expect, test } from 'bun:test';

import {
  BundleHash,
  bundlePath,
  contentBundles,
  contentPackFromBundles,
  descriptionFromBundle,
  descriptionShard,
} from './content-bundle';
import type { BundleBody, CanonicalJson, BundleFile, ContentBundles, KindBundles, PackBundles } from './content-bundle';
import { ContentId, contentId, EntrySlug, PackId } from './content-id';
import type { ContentPack } from './content-pack';
import { contentPackFromFiles, packContentsFromFiles } from './content-pack-file';
import { RichTextString } from './rich-text';
import type { RichText } from './rich-text';

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

const contentIdOf = (slug: string): ContentId => ContentId.parse(idOf(slug));

/** Every file a pack's manifest names. */
function filesOf(pack: PackBundles): readonly BundleFile[] {
  const kinds = pack.kinds.flatMap((kind) =>
    [kind.mechanics, kind.names, kind.descriptions.map(({ file }) => file)].flat(),
  );
  return [pack.file, ...kinds];
}

/** `id`'s description as the bundles give it: undefined when its shard does not exist or does not hold it. */
function descriptionOf(built: ContentBundles, kind: string, id: ContentId): RichText | undefined {
  const shard = kindOf(built, kind).descriptions.find((each) => each.shard === descriptionShard(id));
  return shard === undefined ? undefined : descriptionFromBundle(bodyOf(built, shard.file), id);
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

describe('descriptionFromBundle', () => {
  test('is undefined for an id the shard does not hold', () => {
    expect(descriptionFromBundle({}, contentIdOf('language:common'))).toBeUndefined();
  });

  test('refuses a shard that is not descriptions', () => {
    const shard = { [idOf('language:common')]: 'text' };
    expect(() => descriptionFromBundle(shard, contentIdOf('language:common'))).toThrow();
  });
});
