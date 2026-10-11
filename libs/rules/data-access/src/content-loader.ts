import { inject, Injectable } from '@angular/core';
import { bundlePath, ContentKind, contentPackFromBundles, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentManifest, ContentPack, FetchedKind, KindBundles, PackBundles, PackId } from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER } from '@pioneer/shared/web';

import { ContentBundleCache } from './content-bundle-cache';
import { CONTENT_PACK_CACHE } from './content-pack-cache';

/**
 * Kinds a page is likely to need after one it loaded: the next steps of building a character. Prefetched when idle,
 * so the next step is already in the store.
 */
const LIKELY_NEXT: Readonly<Partial<Record<ContentKind, readonly ContentKind[]>>> = {
  [ContentKind.Ancestry]: [ContentKind.Heritage, ContentKind.Language],
  [ContentKind.Heritage]: [ContentKind.Background],
  [ContentKind.Background]: [ContentKind.Class],
  [ContentKind.Class]: [ContentKind.ClassFeature, ContentKind.Feat],
};

/** The kinds likely next after `kinds`, less those. */
function likelyNext(kinds: readonly ContentKind[]): readonly ContentKind[] {
  const next = new Set(kinds.flatMap((kind) => LIKELY_NEXT[kind] ?? []));
  return [...next].filter((kind) => !kinds.includes(kind));
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

  /**
   * A registry of every official pack with the entries of `kinds`, then the likely next kinds prefetched when idle.
   * A load that fails reads the manifest again and tries once more: a re-seed since the session read it makes the
   * bundles it names a 404.
   */
  public async registry(kinds: readonly ContentKind[]): Promise<ContentRegistry> {
    try {
      return await this.#build(kinds);
    } catch {
      this.#cache.forgetManifest();
      return this.#build(kinds);
    }
  }

  async #build(kinds: readonly ContentKind[]): Promise<ContentRegistry> {
    const manifest = await this.#cache.manifest();
    const packs = await Promise.all(manifest.packs.map(async (pack) => this.#pack(pack, kinds)));
    const registry = new ContentRegistry();
    for (const pack of packs) {
      registry.register(pack);
    }
    this.#prefetch(manifest, likelyNext(kinds));
    return registry;
  }

  async #pack(pack: PackBundles, kinds: readonly ContentKind[]): Promise<ContentPack> {
    const used = kindsIn(pack, kinds).flatMap(({ mechanics, names }) => [mechanics, names]);
    const [file, ...fetched] = await Promise.all([
      this.#cache.bundle(pack.id, pack.file),
      ...kindsIn(pack, kinds).map(async (bundles) => this.#kind(pack.id, bundles)),
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

  async #kind(pack: PackId, { mechanics, names }: KindBundles): Promise<FetchedKind> {
    const [mechanicsBody, namesBody] = await Promise.all([
      this.#cache.bundle(pack, mechanics),
      this.#cache.bundle(pack, names),
    ]);
    return { mechanics: mechanicsBody, names: namesBody };
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
      kindsIn(pack, kinds).map(async (bundles) => this.#kind(pack.id, bundles)),
    );
    try {
      await Promise.all(fetches);
    } catch {
      // Not prefetched: the kinds are fetched when a page needs them.
    }
  }
}
