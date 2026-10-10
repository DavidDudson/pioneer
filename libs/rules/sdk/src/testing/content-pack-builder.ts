import type * as z from 'zod';

import type { AncestryDefinition } from '../ancestry';
import { ContentPack } from '../content-pack';
import type { CreatureDefinition } from '../creature';
import { ContentLicense } from '../license';
import type { NamespaceKind } from '../roll-option-namespace';
import { Size } from '../size';
import { SourceKind } from '../source-ref';
import type { SourceRef } from '../source-ref';
import type { StatisticDefinition } from '../statistic';
import { StatisticKind } from '../statistic';

/** Who wrote the test pack's homebrew; a fixed id so packs built twice are equal. */
const TEST_AUTHOR = '00000000-0000-4000-8000-000000000001';

/** A definition as tests give it: its sources are optional, defaulting to the pack's homebrew. */
type Sourceable<Definition extends z.ZodType> = z.input<Definition> & {
  readonly sources?: readonly z.input<typeof SourceRef>[];
};

/**
 * Test builder for content packs. Defaults to a valid, empty homebrew pack whose entries cite it as their homebrew
 * source; every `with*` returns the builder so tests state only what they care about:
 *
 * ```ts
 * const pack = new ContentPackBuilder().withAncestry('human').build();
 * ```
 */
export class ContentPackBuilder {
  #id = 'test-pack';
  readonly #ancestries: Sourceable<typeof AncestryDefinition>[] = [];
  readonly #creatures: Sourceable<typeof CreatureDefinition>[] = [];
  readonly #statistics: Sourceable<typeof StatisticDefinition>[] = [];
  readonly #namespaces: Record<string, NamespaceKind> = {};

  public withId(id: string): this {
    this.#id = id;
    return this;
  }

  public withAncestry(slug: string, overrides: Partial<Sourceable<typeof AncestryDefinition>> = {}): this {
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

  public withCreature(definition: Sourceable<typeof CreatureDefinition>): this {
    this.#creatures.push(definition);
    return this;
  }

  /** A check whose selector is its slug, with a base formula of `0` unless overridden. */
  public withStatistic(slug: string, overrides: Partial<Sourceable<typeof StatisticDefinition>> = {}): this {
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

  public withNamespace(namespace: string, kind: NamespaceKind): this {
    this.#namespaces[namespace] = kind;
    return this;
  }

  public build(): ContentPack {
    const sources = [{ kind: SourceKind.Homebrew, author: TEST_AUTHOR, pack: this.#id }];
    return ContentPack.define({
      manifest: { id: this.#id, title: 'Test pack', publisher: 'Pioneer tests', license: ContentLicense.Homebrew },
      ancestries: this.#ancestries.map((ancestry) => ({ sources, ...ancestry })),
      creatures: this.#creatures.map((creature) => ({ sources, ...creature })),
      statistics: this.#statistics.map((statistic) => ({ sources, ...statistic })),
      rollOptionNamespaces: this.#namespaces,
    });
  }
}
