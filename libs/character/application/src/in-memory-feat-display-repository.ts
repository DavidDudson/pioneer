import type { FeatDisplaySection } from '@pioneer/character/domain';

import { FeatDisplayRepository } from './feat-display-repository';
import type { FeatDisplayKey, FeatDisplaySetting } from './feat-display-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryFeatDisplayRepository extends FeatDisplayRepository {
  readonly #shown = new Map<string, Set<FeatDisplaySection>>();

  public override async findShown({ userId, characterId }: FeatDisplayKey): Promise<readonly FeatDisplaySection[]> {
    return [...(this.#shown.get(`${userId}/${characterId}`) ?? [])];
  }

  public override async save(
    { userId, characterId }: FeatDisplayKey,
    { section, showGrantOnly }: FeatDisplaySetting,
  ): Promise<void> {
    const key = `${userId}/${characterId}`;
    const sections = this.#shown.get(key) ?? new Set<FeatDisplaySection>();
    if (showGrantOnly) {
      sections.add(section);
    } else {
      sections.delete(section);
    }
    this.#shown.set(key, sections);
  }
}
