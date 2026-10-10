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

/** What a test delivery was asked for, by URL path. */
export type DeliveryRequest = 'manifest' | `${PackId}/${BundleFile}`;

/**
 * Serves packs' bundles from memory, as the content routes would, and records each request. Set `offline` to make
 * every request fail as a dropped connection does.
 */
export class TestContentDelivery implements ContentDelivery {
  public offline = false;
  public readonly requests: DeliveryRequest[] = [];
  readonly #packs: readonly PackContentsLoader[];
  #bundles: Promise<ContentBundles> | undefined;

  public constructor(packs: readonly PackContentsLoader[]) {
    this.#packs = packs;
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
    this.#bundles ??= this.#build();
    return this.#bundles;
  }

  async #build(): Promise<ContentBundles> {
    const contents = await Promise.all(this.#packs.map(async (pack) => pack.load()));
    return contentBundles(contents, testHash);
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
