import type { Provider } from '@angular/core';
import { BundleHash, bundlePath, contentBundles } from '@pioneer/rules/sdk';
import type {
  BundleBody,
  BundleFile,
  CanonicalJson,
  ContentBundles,
  ContentManifest,
  PackContentsLoader,
  PackId,
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

/** What a test delivery was asked for, by URL path. */
export type DeliveryRequest = 'manifest' | `${PackId}/${BundleFile}`;

/**
 * Serves packs' bundles from memory, as the content routes would, and records each request. Set `offline` to make
 * every request fail as a dropped connection does.
 */
export class TestContentDelivery implements ContentDelivery {
  public offline = false;
  public readonly requests: DeliveryRequest[] = [];
  #packs: readonly PackContentsLoader[];
  #bundles: Promise<ContentBundles> | undefined;

  public constructor(packs: readonly PackContentsLoader[]) {
    this.#packs = packs;
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
