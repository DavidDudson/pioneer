import type * as z from 'zod';

import type { AncestryDefinition } from '../ancestry';
import { contentId, EntrySlug, PackId } from '../content-id';
import { ContentKind } from '../content-kind';
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

/** An envelope entry as tests give it, before the pack names its id and sources. */
interface EnvelopeFields {
  readonly kind: ContentKind;
  readonly name: string;
  readonly data: object;
  /** Rule elements as JSON; none when absent. */
  readonly rules?: readonly object[];
  /** The entry's level, for the kinds that have one (feats). */
  readonly level?: number;
}

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
  readonly #entries: EnvelopeFields[] = [];

  public withId(id: string): this {
    this.#id = id;
    return this;
  }

  public withAncestry(name: string, overrides: Partial<Sourceable<typeof AncestryDefinition>> = {}): this {
    this.#ancestries.push({
      slug: `ancestry:${name}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      hitPoints: 8,
      size: Size.Medium,
      speed: 25,
      traits: ['humanoid'],
      boosts: [],
      flaws: [],
      ...overrides,
    });
    return this;
  }

  public withCreature(definition: Sourceable<typeof CreatureDefinition>): this {
    this.#creatures.push(definition);
    return this;
  }

  /** A check whose selector is its name, with a base formula of `0` unless overridden. */
  public withStatistic(name: string, overrides: Partial<Sourceable<typeof StatisticDefinition>> = {}): this {
    this.#statistics.push({
      slug: `statistic:${name}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      selector: name,
      domains: [],
      base: '0',
      kind: StatisticKind.Check,
      ...overrides,
    });
    return this;
  }

  /**
   * A background with these boosts, each the attributes it may go to (`[['str', 'dex'], [...all six]]`), and `rules` as
   * JSON (its trained skills and skill feat).
   */
  public withBackground(name: string, boosts: readonly (readonly string[])[], rules: readonly object[] = []): this {
    this.#entries.push({ kind: ContentKind.Background, name, data: { boosts }, rules });
    return this;
  }

  /** A heritage of this pack's ancestry `ancestry`, or a versatile one without it. */
  public withHeritage(name: string, ancestry?: string): this {
    const data = ancestry === undefined ? {} : { ancestry: this.idOf(ContentKind.Ancestry, ancestry) };
    this.#entries.push({ kind: ContentKind.Heritage, name, data });
    return this;
  }

  /** A skill feat. */
  public withFeat(name: string): this {
    this.#entries.push({ kind: ContentKind.Feat, name, data: { category: 'skill' }, level: 1 });
    return this;
  }

  /** The id this pack gives its entry of `kind` named `name`, as `GrantItem` and heritages name it. */
  public idOf(kind: ContentKind, name: string): string {
    return contentId(PackId.parse(this.#id), EntrySlug.parse(`${kind}:${name}`));
  }

  /** A class whose key attribute may be any of `keyAttribute`. */
  public withClass(name: string, keyAttribute: readonly string[]): this {
    this.#entries.push({ kind: ContentKind.Class, name, data: { keyAttribute, hitPoints: 10, additionalSkills: 3 } });
    return this;
  }

  /** An item of an equipment kind, slugged `<kind>:<name>`, with its kind's `data` (`{ bulk: 1, usage: ... }`). */
  public withItem(kind: ContentKind, name: string, data: object): this {
    this.#entries.push({ kind, name, data, level: 0 });
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
      otherEntries: this.#entries.map(({ kind, name, data, rules = [], level }) => ({
        id: this.idOf(kind, name),
        pack: this.#id,
        kind,
        slug: `${kind}:${name}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        rarity: 'common',
        traits: [],
        sources,
        description: [],
        rules,
        data,
        ...(level === undefined ? {} : { level }),
      })),
    });
  }
}
