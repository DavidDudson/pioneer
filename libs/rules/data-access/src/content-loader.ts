import { inject, Injectable } from '@angular/core';
import {
  bundlePath,
  ContentKind,
  contentPackFromBundles,
  ContentRegistry,
  descriptionFromBundle,
  descriptionShard,
} from '@pioneer/rules/sdk';
import type {
  BundleFile,
  ContentEntry,
  ContentManifest,
  ContentPack,
  ContentPackId,
  FetchedKind,
  KindBundles,
  PackBundles,
  PackId,
  RichText,
} from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER } from '@pioneer/shared/web';

import { ContentBundleCache } from './content-bundle-cache';
import { CONTENT_PACK_CACHE } from './content-pack-cache';

/**
 * Kinds a page is likely to need after one it loaded: the next steps of building a character. Prefetched when idle,
 * so the next step is already in the store.
 */
const LIKELY_NEXT: Readonly<Partial<Record<ContentKind, readonly ContentKind[]>>> = {
  [ContentKind.Ancestry]: [ContentKind.AncestryFeature, ContentKind.Heritage, ContentKind.Language],
  [ContentKind.Heritage]: [ContentKind.Background],
  [ContentKind.Background]: [ContentKind.Class],
  [ContentKind.Class]: [ContentKind.ClassFeature, ContentKind.Feat],
};

/** The kinds likely next after `kinds`, less those. */
function likelyNext(kinds: readonly ContentKind[]): readonly ContentKind[] {
  const next = new Set(kinds.flatMap((kind) => LIKELY_NEXT[kind] ?? []));
  return [...next].filter((kind) => !kinds.includes(kind));
}

/** Where a pack's bundles are fetched from: the public ones, or the signed-in user's homebrew. */
type BundleFetch = (pack: PackId, file: BundleFile) => Promise<unknown>;

/** A kind's two bundles of `pack`, fetched together. */
async function fetchKind(pack: PackId, { mechanics, names }: KindBundles, fetch: BundleFetch): Promise<FetchedKind> {
  const [mechanicsBody, namesBody] = await Promise.all([fetch(pack, mechanics), fetch(pack, names)]);
  return { mechanics: mechanicsBody, names: namesBody };
}

/** The file of `entry`'s shard of its kind's descriptions, when its pack is in `manifest` and the entry has one. */
function shardFile(manifest: ContentManifest, entry: ContentEntry): BundleFile | undefined {
  const shard = descriptionShard(entry.id);
  return manifest.packs
    .find((pack) => pack.id === entry.pack)
    ?.kinds.find((bundles) => bundles.kind === entry.kind)
    ?.descriptions.find((bundle) => bundle.shard === shard)?.file;
}

/** A pack's bundles for `kinds`, of the kinds it has. */
function kindsIn(pack: PackBundles, kinds: readonly ContentKind[]): readonly KindBundles[] {
  return pack.kinds.filter((bundles) => kinds.includes(bundles.kind));
}

/**
 * Builds `ContentRegistry`s in the browser from the content bundles: every pack the manifest names, with only the
 * kinds asked for, so a page fetches only what its engine reads (spells only when a caster needs them).
 * A pack built from the same bundles before is reused from `CONTENT_PACK_CACHE` rather than checked again.
 */
@Injectable({ providedIn: 'root' })
export class ContentLoader {
  readonly #cache = inject(ContentBundleCache);
  readonly #whenIdle = inject(IDLE_SCHEDULER);
  readonly #packs = inject(CONTENT_PACK_CACHE);
  readonly #official: BundleFetch = async (pack, file) => this.#cache.bundle(pack, file);
  readonly #homebrew: BundleFetch = async (pack, file) => this.#cache.homebrewBundle(pack, file);

  /**
   * A registry of every official pack with the entries of `kinds`, then the homebrew `homebrew` packs the user may read
   * (a character's or a campaign's, with what they extend), then the likely next kinds prefetched when idle. A load
   * that fails reads the manifests again and tries once more: a re-seed since the session read them makes the bundles
   * they name a 404.
   */
  public async registry(
    kinds: readonly ContentKind[],
    homebrew: readonly ContentPackId[] = [],
  ): Promise<ContentRegistry> {
    try {
      return await this.#build(kinds, homebrew);
    } catch {
      this.#cache.forgetManifest();
      this.#cache.forgetHomebrew();
      return this.#build(kinds, homebrew);
    }
  }

  /**
   * `entry`'s description, fetched from its shard of the kind's description bundles: a shard is fetched when an entry
   * in it is first opened and kept in the store after, so the entry's neighbours cost nothing. Undefined when the
   * entry has no description, so the caller shows its summary. A failed fetch reads the manifests again and tries once
   * more, as `registry` does.
   */
  public async description(
    entry: ContentEntry,
    homebrew: readonly ContentPackId[] = [],
  ): Promise<RichText | undefined> {
    try {
      return await this.#description(entry, homebrew);
    } catch {
      this.#cache.forgetManifest();
      this.#cache.forgetHomebrew();
      return this.#description(entry, homebrew);
    }
  }

  async #description(entry: ContentEntry, homebrew: readonly ContentPackId[]): Promise<RichText | undefined> {
    const [manifest, brewed] = await Promise.all([this.#cache.manifest(), this.#cache.homebrewManifest(homebrew)]);
    const official = manifest.packs.some((pack) => pack.id === entry.pack);
    const file = shardFile(official ? manifest : brewed, entry);
    if (file === undefined) {
      return undefined;
    }
    const body = await (official ? this.#official : this.#homebrew)(entry.pack, file);
    try {
      return descriptionFromBundle(body, entry.id);
    } catch (error) {
      // A kept body that no longer reads must not stick: drop it, so the retry fetches it again.
      await this.#cache.forget(entry.pack, [file]);
      throw error;
    }
  }

  async #build(kinds: readonly ContentKind[], homebrew: readonly ContentPackId[]): Promise<ContentRegistry> {
    const [manifest, brewed] = await Promise.all([this.#cache.manifest(), this.#cache.homebrewManifest(homebrew)]);
    const packs = await Promise.all([
      ...manifest.packs.map(async (pack) => this.#pack(pack, kinds, this.#official)),
      ...brewed.packs.map(async (pack) => this.#pack(pack, kinds, this.#homebrew)),
    ]);
    const registry = new ContentRegistry();
    for (const pack of packs) {
      registry.register(pack);
    }
    this.#prefetch(manifest, likelyNext(kinds));
    return registry;
  }

  async #pack(pack: PackBundles, kinds: readonly ContentKind[], fetch: BundleFetch): Promise<ContentPack> {
    const used = kindsIn(pack, kinds).flatMap(({ mechanics, names }) => [mechanics, names]);
    const [file, ...fetched] = await Promise.all([
      fetch(pack.id, pack.file),
      ...kindsIn(pack, kinds).map(async (bundles) => fetchKind(pack.id, bundles, fetch)),
    ]);
    const key = [pack.file, ...used].map((each) => bundlePath(pack.id, each)).join('\n');
    const built = this.#packs.get(key);
    if (built !== undefined) {
      return built;
    }
    try {
      const contentPack = contentPackFromBundles(file, fetched);
      this.#packs.set(key, contentPack);
      return contentPack;
    } catch (error) {
      // A kept body that no longer reads (a truncated record) must not stick: drop it, so the retry fetches it again.
      await this.#cache.forget(pack.id, [pack.file, ...used]);
      throw error;
    }
  }

  /** Fetches `kinds` into the store when the browser is idle. A failure only means they are fetched when needed. */
  #prefetch(manifest: ContentManifest, kinds: readonly ContentKind[]): void {
    if (kinds.length === 0) {
      return;
    }
    this.#whenIdle(() => {
      // oxlint-disable-next-line typescript/no-floating-promises -- fetchKinds catches every error, so it never rejects
      this.#fetchKinds(manifest, kinds);
    });
  }

  async #fetchKinds(manifest: ContentManifest, kinds: readonly ContentKind[]): Promise<void> {
    const fetches = manifest.packs.flatMap((pack) =>
      kindsIn(pack, kinds).map(async (bundles) => fetchKind(pack.id, bundles, this.#official)),
    );
    try {
      await Promise.all(fetches);
    } catch {
      // Not prefetched: the kinds are fetched when a page needs them.
    }
  }
}
