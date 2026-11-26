import {
  BundleHash,
  bundlePath,
  contentPackFromBundles,
  descriptionFromBundle,
  descriptionShard,
} from '../content-bundle';
import type {
  BundleBody,
  BundleFile,
  CanonicalJson,
  KindBundles,
  LocalisedDescription,
  PackBundles,
} from '../content-bundle';
import { contentBundles } from '../content-bundle-write';
import type { ContentBundles } from '../content-bundle-write';
import { ContentId, contentId, EntrySlug, PackId } from '../content-id';
import type { ContentPack } from '../content-pack';
import { packContentsFromFiles } from '../content-pack-file';

export const PACK = PackId.parse('homebrew');
export const idOf = (slug: string): string => contentId(PACK, EntrySlug.parse(slug));
export const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };

const HEX = 16;
const HASH_DIGITS = 16;

/** A hasher that names a bundle by its length, so tests can predict file names. */
export function lengthHash(json: CanonicalJson): BundleHash {
  return BundleHash.parse(json.length.toString(HEX).padStart(HASH_DIGITS, '0'));
}

/** A language entry as JSON. */
export interface LanguageFixture {
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
export function language(slug: string, name: string): LanguageFixture {
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

export const ancestry = {
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

export const common = language('common', 'Common');
export const draconic = language('draconic', 'Draconic');

export function bundles(entries: readonly object[] = [ancestry, common, draconic]): ContentBundles {
  return contentBundles([packContentsFromFiles(packFile, [entries])], lengthHash);
}

export function onlyPack({ manifest }: ContentBundles): PackBundles {
  const [pack] = manifest.packs;

  if (pack === undefined) {
    throw new Error('Expected one pack in the manifest');
  }

  return pack;
}

/** The bundles of `kind` in the only pack. */
export function kindOf(built: ContentBundles, kind: string): KindBundles {
  const found = onlyPack(built).kinds.find((bundled) => bundled.kind === kind);

  if (found === undefined) {
    throw new Error(`Expected ${kind} in the manifest`);
  }

  return found;
}

export function bodyOf(built: ContentBundles, file: BundleFile): BundleBody {
  const found = built.bodies.get(bundlePath(PACK, file));

  if (found === undefined) {
    throw new Error(`Expected a body for ${file}`);
  }

  return found;
}

export function fetched(built: ContentBundles, kinds: readonly string[]): ContentPack {
  const pack = onlyPack(built);

  return contentPackFromBundles(
    bodyOf(built, pack.file),
    kinds.map((kind) => ({
      mechanics: bodyOf(built, kindOf(built, kind).mechanics),
      names: bodyOf(built, kindOf(built, kind).names),
    })),
  );
}

export const contentIdOf = (slug: string): ContentId => ContentId.parse(idOf(slug));

/** `id`'s description with its `untranslated` mark, as the bundles give it. */
export function localisedOf(built: ContentBundles, kind: string, id: ContentId): LocalisedDescription | undefined {
  const shard = kindOf(built, kind).descriptions.find((each) => each.shard === descriptionShard(id));

  return shard === undefined ? undefined : descriptionFromBundle(bodyOf(built, shard.file), id);
}
