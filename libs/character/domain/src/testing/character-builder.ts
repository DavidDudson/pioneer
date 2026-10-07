import { AncestryId, AttributeModifiers, contentId } from '@pioneer/rules/sdk';
import type { Attribute } from '@pioneer/rules/sdk';
import { derivedId, FixtureNamespace, fixedClock } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

import { Character } from '../character';
import { CharacterId } from '../character-fields';

/** `player-core/human`, the default ancestry for fixtures. */
export const humanAncestryId: AncestryId = AncestryId.parse(contentId('player-core', 'human'));

/**
 * Test builder for characters. The id is a UUIDv5 of the name, so a fixture
 * named "Valeros" has the same id in every test run and every test file.
 *
 * ```ts
 * const valeros = new CharacterBuilder().named('Valeros').atLevel(3).build();
 * ```
 */
export class CharacterBuilder {
  #name = 'Valeros';
  #ancestry: AncestryId = humanAncestryId;
  #level = 1;
  #version = 1;
  #attributes = AttributeModifiers.none;
  #at: Temporal.Instant = fixedClock('2026-01-01T00:00:00Z').now();

  public named(name: string): this {
    this.#name = name;
    return this;
  }

  public withAncestry(ancestry: AncestryId): this {
    this.#ancestry = ancestry;
    return this;
  }

  public atLevel(level: number): this {
    this.#level = level;
    return this;
  }

  public atVersion(version: number): this {
    this.#version = version;
    return this;
  }

  public withAttribute(attribute: Attribute, modifier: number): this {
    this.#attributes = this.#attributes.with(attribute, modifier);
    return this;
  }

  public createdAt(instant: Temporal.Instant): this {
    this.#at = instant;
    return this;
  }

  public build(): Character {
    return new Character({
      id: CharacterId.parse(derivedId(FixtureNamespace, `character:${this.#name}`)),
      version: this.#version,
      name: this.#name,
      ancestry: this.#ancestry,
      level: this.#level,
      attributes: this.#attributes,
      createdAt: this.#at,
      updatedAt: this.#at,
    });
  }
}
