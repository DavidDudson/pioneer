import type { ContentBundles, ContentPackId } from '@pioneer/rules/sdk';

/**
 * Port to the browser bundles of homebrew packs. It decides nothing about who may read them: `HomebrewBundleService`
 * does. The adapter lives in the composition root, over the content tables.
 */
export abstract class PackBundleSource {
  /** The bundles of `packs` and the packs they extend, each after what it extends. */
  public abstract of(packs: readonly ContentPackId[]): Promise<ContentBundles>;
}
