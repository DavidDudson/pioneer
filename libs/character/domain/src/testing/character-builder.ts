import { AncestryId, AttributeModifier, AttributeModifiers, contentId, PackId, Slug } from '@pioneer/rules/sdk';
import type { Attribute } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import {
  derivedId,
  FIRST_VERSION,
  FixtureNamespace,
  fixedClock,
  InstantCodec,
  UserId,
  Version,
} from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import * as z from 'zod';

import { Character } from '../character';
import { CharacterId, CharacterLevel, CharacterName } from '../character-fields';

/** The fields `CharacterBuilder.random` fakes. */
const RandomFields = z.object({
  name: CharacterName,
  ancestry: AncestryId,
  level: CharacterLevel,
  version: Version,
  ownerId: UserId,
  attributes: AttributeModifiers.codec,
  createdAt: InstantCodec,
});

/** `player-core/human`, the default ancestry for fixtures. */
export const humanAncestryId: AncestryId = AncestryId.parse(
  contentId(PackId.parse('player-core'), Slug.parse('human')),
);

/** Owner of fixtures unless `ownedBy` says otherwise; same id in every run. */
export const fixtureOwnerId: UserId = UserId.parse(derivedId(FixtureNamespace, 'user:Amiri'));

/**
 * Test builder for characters. The id is a UUIDv5 of the name, so a fixture
 * named "Valeros" has the same id in every test run and every test file.
 *
 * ```ts
 * const valeros = new CharacterBuilder().named('Valeros').atLevel(3).build();
 * const anyone = CharacterBuilder.random(42).atLevel(20).build(); // fake, reproducible
 * ```
 */
export class CharacterBuilder {
  #name: CharacterName = CharacterName.parse('Valeros');
  #ancestry: AncestryId = humanAncestryId;
  #level: CharacterLevel = CharacterLevel.parse(1);
  #version: Version = FIRST_VERSION;
  #ownerId: UserId = fixtureOwnerId;
  #attributes = AttributeModifiers.none;
  #at: Temporal.Instant = fixedClock('2026-01-01T00:00:00Z').now();

  /** Every field from a seeded fake (zod-schema-faker); same seed, same character. */
  public static random(seedValue: number): CharacterBuilder {
    installRulesFakes();
    const fake = fakeSeeded(RandomFields, seedValue);
    const builder = new CharacterBuilder()
      .named(fake.name)
      .withAncestry(fake.ancestry)
      .atLevel(fake.level)
      .atVersion(fake.version)
      .ownedBy(fake.ownerId)
      .createdAt(fake.createdAt);
    builder.#attributes = fake.attributes;
    return builder;
  }

  public named(name: string): this {
    this.#name = CharacterName.parse(name);
    return this;
  }

  public ownedBy(ownerId: UserId): this {
    this.#ownerId = ownerId;
    return this;
  }

  public withAncestry(ancestry: AncestryId): this {
    this.#ancestry = ancestry;
    return this;
  }

  public atLevel(level: number): this {
    this.#level = CharacterLevel.parse(level);
    return this;
  }

  public atVersion(version: number): this {
    this.#version = Version.parse(version);
    return this;
  }

  public withAttribute(attribute: Attribute, modifier: number): this {
    this.#attributes = this.#attributes.with(attribute, AttributeModifier.parse(modifier));
    return this;
  }

  public createdAt(instant: Temporal.Instant): this {
    this.#at = instant;
    return this;
  }

  public build(): Character {
    return Character.create({
      id: CharacterId.parse(derivedId(FixtureNamespace, `character:${this.#name}`)),
      ownerId: this.#ownerId,
      name: this.#name,
      ancestry: this.#ancestry,
      level: this.#level,
      attributes: this.#attributes,
      now: this.#at,
    }).withVersion(this.#version);
  }
}
