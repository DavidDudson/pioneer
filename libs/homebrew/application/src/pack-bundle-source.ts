import type { ContentBundles, ContentPackId } from '@pioneer/rules/sdk';
import type { ContentLocale } from '@pioneer/shared/kernel';

/**
 * Port to the browser bundles of homebrew packs. It decides nothing about who may read them: `HomebrewBundleService`
 * does. The adapter lives in the composition root, over the content tables.
 */
export abstract class PackBundleSource {
  /**
   * The bundles of `packs` and the packs they extend, each after what it extends, with names and descriptions in
   * `locale` and the source locale's where it has none.
   */
  public abstract of(packs: readonly ContentPackId[], locale: ContentLocale): Promise<ContentBundles>;
}
