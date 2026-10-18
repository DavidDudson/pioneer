import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, ContentPackId, PackId } from './content-id';
import { ContentKindSchema } from './content-kind';
import type { ContentPack } from './content-pack';
import { contentPackFromContents, packContentsFromFiles } from './content-pack-file';
import { ContentText } from './content-text';
import { RichText } from './rich-text';

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
 * pack's `pack.json`, `<kind>.mech.<hash>.json` for a kind's mechanics, `<kind>.names.<locale>.<hash>.json` for its
 * names and `<kind>.desc.<locale>.<shard>.<hash>.json` for one shard of its descriptions.
 */
export const BundleFile = z
  .string()
  .regex(/^(?:pack|[a-z-]+\.(?:mech|names\.[a-z]{2}|desc\.[a-z]{2}\.[\da-f]))\.[\da-f]{16}\.json$/u)
  .brand<'BundleFile'>();
export type BundleFile = z.infer<typeof BundleFile>;

/** A bundle's size in bytes, as served. */
export const ByteCount = z.number().int().nonnegative().brand<'ByteCount'>();
export type ByteCount = z.infer<typeof ByteCount>;

/** Where a bundle is kept: `<pack>/<file>`, as its URL ends and as the browser caches it. */
export const BundlePath = z.string().brand<'BundlePath'>();
export type BundlePath = z.infer<typeof BundlePath>;

export function bundlePath(pack: PackId, file: BundleFile): BundlePath {
  return BundlePath.parse(`${pack}/${file}`);
}

/** A bundle's contents as served: plain JSON, read by the schema its file name calls for. */
export const BundleBody = z.json();
export type BundleBody = z.infer<typeof BundleBody>;

/**
 * Which descriptions of a kind a bundle holds: the first hex digit of the entry's id. A kind's descriptions are many
 * and long, so they are fetched a shard at a time, when an entry is opened.
 */
export const DescriptionShard = z
  .string()
  .regex(/^[\da-f]$/u)
  .brand<'DescriptionShard'>();
export type DescriptionShard = z.infer<typeof DescriptionShard>;

/** The shard that holds `id`'s description. */
export function descriptionShard(id: ContentId): DescriptionShard {
  return DescriptionShard.parse(id.slice(0, 1).toLowerCase());
}

/** One shard of a kind's descriptions, in the source locale until other locales ship (#693). */
export const DescriptionBundle = z.strictObject({ shard: DescriptionShard, file: BundleFile });
export type DescriptionBundle = z.infer<typeof DescriptionBundle>;

/**
 * The bundles of one kind in a pack. Mechanics never depend on locale; names and descriptions are in the source
 * locale. `descriptions` has a shard for each id prefix that has an entry with a description.
 */
export const KindBundles = z.strictObject({
  kind: ContentKindSchema,
  mechanics: BundleFile,
  names: BundleFile,
  descriptions: z.array(DescriptionBundle).readonly(),
});
export type KindBundles = z.infer<typeof KindBundles>;

/**
 * One pack's bundles: its `pack.json`, then a kind's bundles for each kind it has entries of. `sizes` is the byte
 * size of each file named here; it is optional so a manifest an older build kept in the browser still reads.
 */
export const PackBundles = z.strictObject({
  id: PackId,
  file: BundleFile,
  kinds: z.array(KindBundles).readonly(),
  sizes: z.record(BundleFile, ByteCount).optional(),
});
export type PackBundles = z.infer<typeof PackBundles>;

/** Every official pack's current bundles, in registration order. Short-lived; the bundles it names never change. */
export const ContentManifest = z.strictObject({ packs: z.array(PackBundles).readonly() });
export type ContentManifest = z.infer<typeof ContentManifest>;

/** Names of a kind's entries, by id. Short summaries join them when entries have them. */
const NamesBundle = z.record(ContentId, z.strictObject({ name: ContentText }));
export type NamesBundle = z.infer<typeof NamesBundle>;

/** The descriptions of one shard of a kind, by id. An entry without a description is not in it. */
const DescriptionsBundle = z.record(ContentId, RichText);

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

/** The homebrew packs whose bundles are asked for. */
export const HomebrewManifestRequest = z.strictObject({ packs: z.array(ContentPackId).readonly() });
export type HomebrewManifestRequest = z.infer<typeof HomebrewManifestRequest>;

/**
 * Homebrew content for the browser, for a signed-in user. Unlike official content it is not public (ADR-0007): the
 * manifest lists, of the packs asked for (a character's or a campaign's), the ones the user may read and the packs they
 * extend; a pack the user may not read is left out, and its bundle is a 404, the same as a missing one. Responses are
 * `private`, so no shared cache keeps them.
 */
export const HomebrewContentContract = {
  manifest: new Endpoint({
    method: HttpMethod.Post,
    path: '/content/homebrew/manifest',
    params: NoParams,
    query: NoQuery,
    body: HomebrewManifestRequest,
    response: ContentManifest,
  }),
  bundle: new Endpoint({
    method: HttpMethod.Get,
    path: '/content/homebrew/bundles/:pack/:file',
    params: BundleParams,
    query: NoQuery,
    body: NoBody,
    response: BundleBody,
  }),
} as const;

/** A kind's bundles as fetched, before they are read. */
export interface FetchedKind {
  readonly mechanics: unknown;
  readonly names: unknown;
}

/** An entry put back together from its kind's bundles. Descriptions come with their own bundles (`descriptionFromBundle`). */
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

/** `id`'s description in a fetched description shard, or undefined when the entry has none. */
export function descriptionFromBundle(shard: unknown, id: ContentId): RichText | undefined {
  return DescriptionsBundle.parse(shard)[id];
}
