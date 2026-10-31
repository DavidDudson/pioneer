import type { Provider } from '@angular/core';
import {
  BundleHash,
  bundlePath,
  contentBundles,
  contentPackId,
  isLegacyLicense,
  SearchTotal,
} from '@pioneer/rules/sdk';
import type {
  BundleBody,
  BundleFile,
  CanonicalJson,
  ContentBundles,
  ContentEntry,
  ContentManifest,
  ContentPackId,
  ContentSearchQuery,
  ContentSearchResult,
  PackContentsLoader,
  PackId,
  SearchText,
} from '@pioneer/rules/sdk';

import { CONTENT_BUNDLE_STORE } from '../bundle-store';
import type { BundleStore } from '../bundle-store';
import type { ContentDelivery } from '../content-delivery';
import { CONTENT_DELIVERY } from '../content-delivery';
import { MemoryBundleStore } from '../memory-bundle-store';

/** A prime below 2^32, so a running hash times a small multiplier stays an exact number. */
const MODULUS = 4_294_967_291;
/** Two small primes, so the two halves of a hash differ. */
const FIRST_MULTIPLIER = 31;
const SECOND_MULTIPLIER = 131;
const HEX = 16;
const WORD_DIGITS = 8;

/** A polynomial hash of `text` with `multiplier`, as 8 hex digits. */
function polynomial(text: string, multiplier: number): string {
  let hash = 0;
  for (const character of text) {
    hash = (hash * multiplier + (character.codePointAt(0) ?? 0)) % MODULUS;
  }
  return hash.toString(HEX).padStart(WORD_DIGITS, '0');
}

/** A stable hash the browser can take without SHA-256: tests only need equal input to give equal names. */
function testHash(json: CanonicalJson): BundleHash {
  return BundleHash.parse(`${polynomial(json, FIRST_MULTIPLIER)}${polynomial(json, SECOND_MULTIPLIER)}`);
}

/** One step of the bundle cache: the bundles of the loaders on the path here, and the steps for each next loader. */
interface BuiltBundles {
  bundles?: Promise<ContentBundles>;
  readonly next: WeakMap<PackContentsLoader, BuiltBundles>;
}

/**
 * Bundles built per sequence of pack loaders, shared by every delivery serving the same loaders in the same order
 * (each test builds its own list), so the specs that open pages do not rebuild and rehash Player Core's import.
 */
const built: BuiltBundles = { next: new WeakMap() };

async function build(packs: readonly PackContentsLoader[]): Promise<ContentBundles> {
  const contents = await Promise.all(packs.map(async (pack) => pack.load()));
  return contentBundles(contents, testHash);
}

async function bundlesOf(packs: readonly PackContentsLoader[]): Promise<ContentBundles> {
  let step = built;
  for (const pack of packs) {
    const next = step.next.get(pack) ?? { next: new WeakMap() };
    step.next.set(pack, next);
    step = next;
  }
  step.bundles ??= build(packs);
  return step.bundles;
}

/** Every string under a `text` key in `value`: the words of a rich text description. */
function textsOf(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => textsOf(item));
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    key === 'text' && typeof item === 'string' ? [item] : textsOf(item),
  );
}

/** Whether every word of `query` is in the entry's name or description: a stand-in for the server's full-text search. */
function matches({ name, description }: ContentEntry, query: SearchText): boolean {
  const haystack = [name, ...textsOf(description)].join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/u)
    .every((word) => haystack.includes(word));
}

/** What a test delivery was asked for, by URL path. */
export type DeliveryRequest =
  'manifest' | 'homebrew-manifest' | 'search' | `${PackId}/${BundleFile}` | `homebrew:${PackId}/${BundleFile}`;

/**
 * Serves packs' bundles from memory, as the content routes would, and records each request. Set `offline` to make
 * every request fail as a dropped connection does.
 */
export class TestContentDelivery implements ContentDelivery {
  public offline = false;
  public readonly requests: DeliveryRequest[] = [];
  #packs: readonly PackContentsLoader[];
  readonly #homebrew: readonly PackContentsLoader[];
  #bundles: Promise<ContentBundles> | undefined;

  /** Serves `packs` publicly, and `homebrew` to the signed-in user who asks for them. */
  public constructor(packs: readonly PackContentsLoader[], homebrew: readonly PackContentsLoader[] = []) {
    this.#packs = packs;
    this.#homebrew = homebrew;
  }

  /** Serves `packs` from now on, as a deploy that re-seeds them does: bundles no longer current fail. */
  public reseed(packs: readonly PackContentsLoader[]): void {
    this.#packs = packs;
    this.#bundles = undefined;
  }

  public readonly manifest = async (): Promise<ContentManifest> => {
    this.requests.push('manifest');
    this.#checkOnline();
    const { manifest } = await this.#built();
    return manifest;
  };

  public readonly bundle = async (pack: PackId, file: BundleFile): Promise<BundleBody> => {
    this.requests.push(`${pack}/${file}`);
    this.#checkOnline();
    const { bodies } = await this.#built();
    const body = bodies.get(bundlePath(pack, file));
    if (body === undefined) {
      throw new Error(`No bundle ${pack}/${file}`);
    }
    return body;
  };

  public readonly homebrewManifest = async (asked: readonly ContentPackId[]): Promise<ContentManifest> => {
    this.requests.push('homebrew-manifest');
    this.#checkOnline();
    const { manifest } = await bundlesOf(this.#homebrew);
    return { packs: manifest.packs.filter((pack) => asked.includes(contentPackId(pack.id))) };
  };

  public readonly homebrewBundle = async (pack: PackId, file: BundleFile): Promise<BundleBody> => {
    this.requests.push(`homebrew:${pack}/${file}`);
    this.#checkOnline();
    const { bodies } = await bundlesOf(this.#homebrew);
    const body = bodies.get(bundlePath(pack, file));
    if (body === undefined) {
      throw new Error(`No homebrew bundle ${pack}/${file}`);
    }
    return body;
  };

  /** The entries of the served packs that have all the words, names first; every page holds them all. */
  public readonly search = async ({ query, kinds, legacy }: ContentSearchQuery): Promise<ContentSearchResult> => {
    this.requests.push('search');
    this.#checkOnline();
    const contents = await Promise.all(this.#packs.map(async (pack) => pack.load()));
    const found = contents
      .filter((pack) => legacy || !isLegacyLicense(pack.file.license))
      .flatMap((pack) => pack.entries)
      .filter((entry) => (kinds.length === 0 || kinds.includes(entry.kind)) && matches(entry, query));
    return { ids: found.map(({ id }) => id), total: SearchTotal.parse(found.length) };
  };

  async #built(): Promise<ContentBundles> {
    this.#bundles ??= bundlesOf(this.#packs);
    return this.#bundles;
  }

  #checkOnline(): void {
    if (this.offline) {
      throw new TypeError('Failed to fetch');
    }
  }
}

/** Content served by `delivery` and kept in `store`; pass one store to two TestBeds to model a second visit. */
export function provideContentTesting(
  delivery: ContentDelivery,
  store: BundleStore = new MemoryBundleStore(),
): Provider[] {
  return [
    { provide: CONTENT_DELIVERY, useValue: delivery },
    { provide: CONTENT_BUNDLE_STORE, useValue: store },
  ];
}

/**
 * Builds the bundles a delivery serving `packs` will serve, so a page opened next renders within a test's
 * `vi.waitFor`: the first build of Player Core's import takes seconds on a slow runner, and later ones reuse it.
 */
export async function prebuildContentTesting(packs: readonly PackContentsLoader[]): Promise<void> {
  await bundlesOf(packs);
}
