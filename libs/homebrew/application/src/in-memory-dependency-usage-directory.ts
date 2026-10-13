import { UsingEntryName } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';

import { DependencyUsageDirectory } from './dependency-usage-directory';

interface Use {
  readonly pack: ContentPackId;
  readonly dependsOn: ContentPackId;
  readonly entry: UsingEntryName;
}

/** Directory adapter for tests: uses given up front. */
export class InMemoryDependencyUsageDirectory extends DependencyUsageDirectory {
  readonly #uses: Use[] = [];

  /** The entry `entry` of `pack` references something in `dependsOn`. */
  public use(pack: ContentPackId, dependsOn: ContentPackId, entry: string): this {
    this.#uses.push({ pack, dependsOn, entry: UsingEntryName.parse(entry) });
    return this;
  }

  public override async entriesUsing(
    pack: ContentPackId,
    dependsOn: ContentPackId,
  ): Promise<readonly UsingEntryName[]> {
    return this.#uses
      .filter((use) => use.pack === pack && use.dependsOn === dependsOn)
      .map((use) => use.entry)
      .toSorted((left, right) => left.localeCompare(right));
  }
}
