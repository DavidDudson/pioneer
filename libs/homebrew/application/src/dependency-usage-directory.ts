import type { UsingEntryName } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';

/**
 * Port to the content context for what a pack takes from the packs it extends. Content owns entries, so the adapter
 * reads its tables; `InMemoryDependencyUsageDirectory` is for tests.
 */
export abstract class DependencyUsageDirectory {
  /** The names of the entries in `pack` that reference an entry of `dependsOn`, alphabetically. */
  public abstract entriesUsing(pack: ContentPackId, dependsOn: ContentPackId): Promise<readonly UsingEntryName[]>;
}
