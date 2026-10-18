import { SOURCE_LOCALE } from '@pioneer/shared/kernel';

import { BundleBody, BundleFile, bundlePath, ByteCount, canonicalJson, descriptionShard } from './content-bundle';
import type {
  BundleHash,
  BundlePath,
  CanonicalJson,
  ContentManifest,
  DescriptionBundle,
  DescriptionShard,
  KindBundles,
  NamesBundle,
  PackBundles,
} from './content-bundle';
import type { ContentEntry } from './content-entry';
import type { ContentId, PackId } from './content-id';
import type { ContentKind } from './content-kind';
import type { PackContents } from './content-pack-file';
import type { RichText } from './rich-text';

/** How bundle hashes are taken: the server uses SHA-256, a test may use anything stable. */
export type BundleHasher = (json: CanonicalJson) => BundleHash;

/** The bundles made from a set of packs: the manifest naming them, and each one's contents by path. */
export interface ContentBundles {
  readonly manifest: ContentManifest;
  readonly bodies: ReadonlyMap<BundlePath, BundleBody>;
}

/** Collects bundle bodies under the files their hashes name. */
class BundleWriter {
  readonly #bodies = new Map<BundlePath, BundleBody>();
  readonly #sizes = new Map<BundlePath, ByteCount>();
  readonly #hash: BundleHasher;

  public constructor(hash: BundleHasher) {
    this.#hash = hash;
  }

  public get bodies(): ReadonlyMap<BundlePath, BundleBody> {
    return this.#bodies;
  }

  /** Adds `body` to `pack` under the file `name` gives for its hash, and returns that file. */
  public write(pack: PackId, body: unknown, name: (hash: BundleHash) => BundleFile): BundleFile {
    const json = canonicalJson(body);
    const file = name(this.#hash(json));
    const path = bundlePath(pack, file);
    this.#bodies.set(path, BundleBody.parse(JSON.parse(json)));
    this.#sizes.set(path, ByteCount.parse(new TextEncoder().encode(json).length));
    return file;
  }

  /** The size in bytes of each of `files` in `pack`, as written. */
  public sizes(pack: PackId, files: readonly BundleFile[]): Record<BundleFile, ByteCount> {
    const sized = files.map((file): [BundleFile, ByteCount] => {
      const size = this.#sizes.get(bundlePath(pack, file));
      if (size === undefined) {
        throw new Error(`Bundle ${pack}/${file} was not written`);
      }
      return [file, size];
    });
    return Object.fromEntries(sized);
  }
}

/** An entry as its mechanics bundle holds it: no name and no description. */
function mechanics(entry: ContentEntry): unknown {
  const { name: _name, description: _description, ...rest } = entry;
  return rest;
}

function names(entries: readonly ContentEntry[]): NamesBundle {
  return Object.fromEntries(entries.map((entry) => [entry.id, { name: entry.name }]));
}

/** Entries by kind, each kind's sorted by id so a reordered file gives the same bundles. */
function byKind(entries: readonly ContentEntry[]): ReadonlyMap<ContentKind, readonly ContentEntry[]> {
  const kinds = new Map<ContentKind, ContentEntry[]>();
  for (const entry of entries.toSorted((left, right) => (left.id < right.id ? -1 : 1))) {
    kinds.set(entry.kind, [...(kinds.get(entry.kind) ?? []), entry]);
  }
  return new Map([...kinds].toSorted(([left], [right]) => (left < right ? -1 : 1)));
}

/** A kind's descriptions by shard, in shard order. Entries without a description are left out, so some shards may be missing. */
function descriptionShards(
  entries: readonly ContentEntry[],
): ReadonlyMap<DescriptionShard, Record<ContentId, RichText>> {
  const shards = new Map<DescriptionShard, Record<ContentId, RichText>>();
  for (const entry of entries) {
    if (entry.description.length > 0) {
      const shard = descriptionShard(entry.id);
      shards.set(shard, { ...shards.get(shard), [entry.id]: entry.description });
    }
  }
  return new Map([...shards].toSorted(([left], [right]) => (left < right ? -1 : 1)));
}

function bundleFiles({ file, kinds }: Pick<PackBundles, 'file' | 'kinds'>): readonly BundleFile[] {
  return [
    file,
    ...kinds.flatMap((kind) => [kind.mechanics, kind.names, ...kind.descriptions.map((shard) => shard.file)]),
  ];
}

function packBundles(writer: BundleWriter, { file, entries }: PackContents): PackBundles {
  const pack = file.id;
  const kinds = [...byKind(entries)].map(([kind, ofKind]): KindBundles => ({
    kind,
    descriptions: [...descriptionShards(ofKind)].map(([shard, descriptions]): DescriptionBundle => ({
      shard,
      file: writer.write(pack, descriptions, (hash) =>
        BundleFile.parse(`${kind}.desc.${SOURCE_LOCALE}.${shard}.${hash}.json`),
      ),
    })),
    mechanics: writer.write(
      pack,
      ofKind.map((entry) => mechanics(entry)),
      (hash) => BundleFile.parse(`${kind}.mech.${hash}.json`),
    ),
    names: writer.write(pack, names(ofKind), (hash) => BundleFile.parse(`${kind}.names.${SOURCE_LOCALE}.${hash}.json`)),
  }));
  const packFile = writer.write(pack, file, (hash) => BundleFile.parse(`pack.${hash}.json`));
  const sizes = writer.sizes(pack, bundleFiles({ file: packFile, kinds }));
  return { id: pack, file: packFile, kinds, sizes };
}

/**
 * The bundles the browser loads `packs` from (content-model.md, "Delivery to the browser"): per pack its `pack.json`,
 * and per kind its mechanics and its names, each named by the hash of its canonical JSON. Equal packs give equal
 * bundles, whatever order their files list entries in.
 */
export function contentBundles(packs: readonly PackContents[], hash: BundleHasher): ContentBundles {
  const writer = new BundleWriter(hash);
  const manifest: ContentManifest = { packs: packs.map((contents) => packBundles(writer, contents)) };
  return { manifest, bodies: writer.bodies };
}
