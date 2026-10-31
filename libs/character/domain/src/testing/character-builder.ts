import { AncestryId, ChoiceValue, contentId, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import {
  derivedId,
  FIRST_VERSION,
  fixedClock,
  FixtureNamespace,
  InstantCodec,
  UserId,
  Version,
} from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import * as z from 'zod';

import { Character } from '../character';
import { CharacterId, CharacterLevel, CharacterName } from '../character-fields';
import { CharacterPatchField } from '../character-patch';

/** The fields `CharacterBuilder.random` fakes. */
const RandomFields = z.object({
  name: CharacterName,
  ancestry: AncestryId,
  level: CharacterLevel,
  version: Version,
  ownerId: UserId,
  createdAt: InstantCodec,
});

/** `player-core/human`, the default ancestry for fixtures. */
export const humanAncestryId: AncestryId = AncestryId.parse(
  contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:human')),
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
  readonly #picks = new Map<SlotKey, ChoiceValue>();
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

  /** Picks `selection` in `slot`, as `selectSlot` would, without checking the slot offers it. */
  public picking(slot: string, selection: string): this {
    this.#picks.set(SlotKey.parse(slot), ChoiceValue.parse(selection));
    return this;
  }

  public createdAt(instant: Temporal.Instant): this {
    this.#at = instant;
    return this;
  }

  public build(): Character {
    const created = Character.create({
      id: CharacterId.parse(derivedId(FixtureNamespace, `character:${this.#name}`)),
      ownerId: this.#ownerId,
      name: this.#name,
      ancestry: this.#ancestry,
      level: this.#level,
      now: this.#at,
    });
    let picked = created;
    for (const [slot, selection] of this.#picks) {
      picked = picked.apply({ field: CharacterPatchField.SelectSlot, slot, selection }, this.#at);
    }
    return picked.withVersion(this.#version);
  }
}
