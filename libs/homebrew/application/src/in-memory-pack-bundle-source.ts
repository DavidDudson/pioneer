import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { BundleHash, contentBundles, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { ContentBundles, ContentPackId } from '@pioneer/rules/sdk';

import { PackBundleSource } from './pack-bundle-source';

/**
 * Bundle source for tests: the bundles of the packs it was given, empty ones, each named by its length so a test needs
 * no digest.
 */
/** Hex digits in a bundle hash. */
const HASH_DIGITS = 16;

/** The radix hex is written in. */
const HEX = 16;

export class InMemoryPackBundleSource extends PackBundleSource {
  readonly #packs: ReadonlyArray<HomebrewPack>;

  public constructor(packs: ReadonlyArray<HomebrewPack>) {
    super();
    this.#packs = packs;
  }

  public override async of(asked: ReadonlyArray<ContentPackId>): Promise<ContentBundles> {
    const contents = this.#packs
      .filter((pack) => asked.includes(pack.id))
      .map((pack) =>
        packContentsFromFiles({ id: pack.slug, title: pack.title, publisher: pack.publisher, license: 'homebrew' }, []),
      );

    return contentBundles(contents, (json) => BundleHash.parse(json.length.toString(HEX).padStart(HASH_DIGITS, '0')));
  }
}
