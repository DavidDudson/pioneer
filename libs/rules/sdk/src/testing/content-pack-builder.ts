import type * as z from 'zod';

import type { AncestryDefinition } from '../ancestry';
import { ContentPack } from '../content-pack';
import type { CreatureDefinition } from '../creature';
import { ContentLicense } from '../license';
import { Size } from '../size';
import type { StatisticDefinition } from '../statistic';
import { StatisticKind } from '../statistic';

/**
 * Test builder for content packs. Defaults to a valid, empty homebrew pack;
 * every `with*` returns the builder so tests state only what they care about:
 *
 * ```ts
 * const pack = new ContentPackBuilder().withAncestry('human').build();
 * ```
 */
export class ContentPackBuilder {
  #id = 'test-pack';
  readonly #ancestries: z.input<typeof AncestryDefinition>[] = [];
  readonly #creatures: z.input<typeof CreatureDefinition>[] = [];
  readonly #statistics: z.input<typeof StatisticDefinition>[] = [];

  public withId(id: string): this {
    this.#id = id;
    return this;
  }

  public withAncestry(slug: string, overrides: Partial<z.input<typeof AncestryDefinition>> = {}): this {
    this.#ancestries.push({
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      hitPoints: 8,
      size: Size.Medium,
      speed: 25,
      traits: ['humanoid'],
      ...overrides,
    });
    return this;
  }

  public withCreature(definition: z.input<typeof CreatureDefinition>): this {
    this.#creatures.push(definition);
    return this;
  }

  /** A check whose selector is its slug, with a base formula of `0` unless overridden. */
  public withStatistic(slug: string, overrides: Partial<z.input<typeof StatisticDefinition>> = {}): this {
    this.#statistics.push({
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      selector: slug,
      domains: [],
      base: '0',
      kind: StatisticKind.Check,
      ...overrides,
    });
    return this;
  }

  public build(): ContentPack {
    return ContentPack.define({
      manifest: { id: this.#id, title: 'Test pack', publisher: 'Pioneer tests', license: ContentLicense.Homebrew },
      ancestries: this.#ancestries,
      creatures: this.#creatures,
      statistics: this.#statistics,
    });
  }
}
