import { PackBundleSource } from '@pioneer/homebrew/application';
import type { StoredPackBundles } from '@pioneer/rules/infrastructure';
import type { ContentBundles, ContentPackId } from '@pioneer/rules/sdk';

/**
 * Homebrew's `PackBundleSource` over the rules context's stored bundles. It lives in the composition root because the
 * homebrew context may not import rules infrastructure.
 */
export class StoredPackBundleSource extends PackBundleSource {
  readonly #bundles: StoredPackBundles;

  public constructor(bundles: StoredPackBundles) {
    super();
    this.#bundles = bundles;
  }

  public override async of(packs: readonly ContentPackId[]): Promise<ContentBundles> {
    return this.#bundles.of(packs);
  }
}
