import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery, SOURCE_LOCALE } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentEntry } from './content-entry';
import { ContentId, PackId } from './content-id';
import { ContentKindSchema } from './content-kind';
import type { ContentKind } from './content-kind';
import type { ContentPack } from './content-pack';
import { contentPackFromContents, packContentsFromFiles } from './content-pack-file';
import type { PackContents } from './content-pack-file';
import { ContentText } from './content-text';

/** JSON text written so equal values give equal text, whatever order their keys were written in. */
export const CanonicalJson = z.string().brand<'CanonicalJson'>();
export type CanonicalJson = z.infer<typeof CanonicalJson>;

/** `value` with every object's keys sorted. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => (left < right ? -1 : 1))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}

/** `value` as JSON with every object's keys sorted: what content and bundle hashes are taken over. */
export function canonicalJson(value: unknown): CanonicalJson {
  return CanonicalJson.parse(JSON.stringify(sortKeys(value)));
}

/** The start of SHA-256, as hex, of a bundle's canonical JSON: what makes its file name change with its contents. */
export const BundleHash = z
  .string()
  .regex(/^[\da-f]{16}$/u)
  .brand<'BundleHash'>();
export type BundleHash = z.infer<typeof BundleHash>;

/**
 * A bundle's file name within its pack (content-model.md, "Delivery to the browser"): `pack.<hash>.json` for the
 * pack's `pack.json`, `<kind>.mech.<hash>.json` for a kind's mechanics and `<kind>.names.<locale>.<hash>.json` for
 * its names.
 */
export const BundleFile = z
  .string()
  .regex(/^(?:pack|[a-z-]+\.(?:mech|names\.[a-z]{2}))\.[\da-f]{16}\.json$/u)
  .brand<'BundleFile'>();
export type BundleFile = z.infer<typeof BundleFile>;

/** Where a bundle is kept: `<pack>/<file>`, as its URL ends and as the browser caches it. */
export const BundlePath = z.string().brand<'BundlePath'>();
export type BundlePath = z.infer<typeof BundlePath>;

export function bundlePath(pack: PackId, file: BundleFile): BundlePath {
  return BundlePath.parse(`${pack}/${file}`);
}

/** A bundle's contents as served: plain JSON, read by the schema its file name calls for. */
export const BundleBody = z.json();
export type BundleBody = z.infer<typeof BundleBody>;

/** The bundles of one kind in a pack. Mechanics never depend on locale; names are in the source locale until Epic 2.4. */
export const KindBundles = z.strictObject({
  kind: ContentKindSchema,
  mechanics: BundleFile,
  names: BundleFile,
});
export type KindBundles = z.infer<typeof KindBundles>;

/** One pack's bundles: its `pack.json`, then a kind's bundles for each kind it has entries of. */
export const PackBundles = z.strictObject({
  id: PackId,
  file: BundleFile,
  kinds: z.array(KindBundles).readonly(),
});
export type PackBundles = z.infer<typeof PackBundles>;

/** Every official pack's current bundles, in registration order. Short-lived; the bundles it names never change. */
export const ContentManifest = z.strictObject({ packs: z.array(PackBundles).readonly() });
export type ContentManifest = z.infer<typeof ContentManifest>;

/** Names of a kind's entries, by id. Short summaries join them when entries have them. */
export const NamesBundle = z.record(ContentId, z.strictObject({ name: ContentText }));
export type NamesBundle = z.infer<typeof NamesBundle>;

/** A kind's mechanics: its entries without names or descriptions, each read once its name is added back. */
const MechanicsBundle = z.array(z.looseObject({ id: ContentId })).readonly();

const BundleParams = z.object({ pack: PackId, file: BundleFile });

/**
 * Official content for the browser, public as ADR-0007 requires. The manifest is short-lived; a bundle is immutable
 * and a file that is not current is a 404.
 */
export const ContentContract = {
  manifest: new Endpoint({
    method: HttpMethod.Get,
    path: '/content/manifest',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: ContentManifest,
  }),
  bundle: new Endpoint({
    method: HttpMethod.Get,
    path: '/content/bundles/:pack/:file',
    params: BundleParams,
    query: NoQuery,
    body: NoBody,
    response: BundleBody,
  }),
} as const;

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
    this.#bodies.set(bundlePath(pack, file), BundleBody.parse(JSON.parse(json)));
    return file;
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

function packBundles(writer: BundleWriter, { file, entries }: PackContents): PackBundles {
  const pack = file.id;
  const kinds = [...byKind(entries)].map(([kind, ofKind]): KindBundles => ({
    kind,
    mechanics: writer.write(
      pack,
      ofKind.map((entry) => mechanics(entry)),
      (hash) => BundleFile.parse(`${kind}.mech.${hash}.json`),
    ),
    names: writer.write(pack, names(ofKind), (hash) => BundleFile.parse(`${kind}.names.${SOURCE_LOCALE}.${hash}.json`)),
  }));
  return { id: pack, file: writer.write(pack, file, (hash) => BundleFile.parse(`pack.${hash}.json`)), kinds };
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

/** A kind's bundles as fetched, before they are read. */
export interface FetchedKind {
  readonly mechanics: unknown;
  readonly names: unknown;
}

/** An entry put back together from its kind's bundles. Descriptions come with their own bundles (Epic 2.4). */
function entryFromBundles(mechanicsEntry: { readonly id: ContentId }, entryNames: NamesBundle): unknown {
  const named = entryNames[mechanicsEntry.id];
  if (named === undefined) {
    throw new Error(`No name for content entry ${mechanicsEntry.id}`);
  }
  return { ...mechanicsEntry, name: named.name, description: [] };
}

/**
 * The `ContentPack` a pack's bundles describe, with just the kinds fetched: each entry is checked as a
 * `ContentEntry` once its name is added back, then filed as `contentPackFromFiles` does. An entry has no description.
 */
export function contentPackFromBundles(packFile: unknown, kinds: readonly FetchedKind[]): ContentPack {
  const entries = kinds.flatMap((kind) => {
    const kindNames = NamesBundle.parse(kind.names);
    return MechanicsBundle.parse(kind.mechanics).map((entry) => entryFromBundles(entry, kindNames));
  });
  return contentPackFromContents(packContentsFromFiles(packFile, [entries]));
}
