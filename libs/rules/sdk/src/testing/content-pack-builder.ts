import type { z } from 'zod';

import type { AncestryDefinition } from '../ancestry';
import { ContentPack } from '../content-pack';
import type { CreatureDefinition } from '../creature';
import { ContentLicense } from '../license';
import { Size } from '../size';

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
      speedFeet: 25,
      traits: ['humanoid'],
      ...overrides,
    });
    return this;
  }

  public withCreature(definition: z.input<typeof CreatureDefinition>): this {
    this.#creatures.push(definition);
    return this;
  }

  public build(): ContentPack {
    return ContentPack.define({
      manifest: { id: this.#id, title: 'Test pack', publisher: 'Pioneer tests', license: ContentLicense.Homebrew },
      ancestries: this.#ancestries,
      creatures: this.#creatures,
    });
  }
}
