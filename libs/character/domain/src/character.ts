import { AncestryId, AttributeModifiers, Modifier, proficiencyBonus } from '@pioneer/rules/sdk';
import type { Attribute, AttributeModifier, Proficiency } from '@pioneer/rules/sdk';
import { FIRST_VERSION, InstantCodec, Version } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { CHARACTER_LEVEL_MIN, CharacterId, CharacterLevel, CharacterName } from './character-fields';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';

/** JSON shape of a character on the wire and in storage. */
export const CharacterWire = z.object({
  id: CharacterId,
  version: Version,
  name: CharacterName,
  ancestry: AncestryId,
  level: CharacterLevel,
  attributes: AttributeModifiers.codec,
  createdAt: InstantCodec,
  updatedAt: InstantCodec,
});

interface CharacterProps {
  readonly id: CharacterId;
  readonly version: Version;
  readonly name: CharacterName;
  readonly ancestry: AncestryId;
  readonly level: CharacterLevel;
  readonly attributes: AttributeModifiers;
  readonly createdAt: Temporal.Instant;
  readonly updatedAt: Temporal.Instant;
}

/**
 * Character aggregate root. Immutable: every change returns a new instance,
 * which is what Angular signals want and what keeps server-side invariants
 * in one place.
 *
 * Serialization: `Character.codec` decodes wire JSON into a `Character` and
 * encodes it back. Use `Character.codec.parse(unknown)` at trust boundaries.
 */
export class Character {
  public static readonly codec = z.codec(CharacterWire, z.instanceof(Character), {
    decode: (wire) => new Character(wire),
    encode: (character) => character.toProps(),
  });

  public readonly id: CharacterId;
  public readonly version: Version;
  public readonly name: CharacterName;
  public readonly ancestry: AncestryId;
  public readonly level: CharacterLevel;
  public readonly attributes: AttributeModifiers;
  public readonly createdAt: Temporal.Instant;
  public readonly updatedAt: Temporal.Instant;

  public constructor(props: CharacterProps) {
    this.id = props.id;
    this.version = props.version;
    this.name = props.name;
    this.ancestry = props.ancestry;
    this.level = props.level;
    this.attributes = props.attributes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(input: {
    readonly id: CharacterId;
    readonly name: CharacterName;
    readonly ancestry: AncestryId;
    readonly now: Temporal.Instant;
  }): Character {
    return new Character({
      id: input.id,
      version: FIRST_VERSION,
      name: input.name,
      ancestry: input.ancestry,
      level: CharacterLevel.parse(CHARACTER_LEVEL_MIN),
      attributes: AttributeModifiers.none,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  public modifier(attribute: Attribute): AttributeModifier {
    return this.attributes.get(attribute);
  }

  /** Total modifier for a check: attribute modifier plus proficiency bonus. */
  public checkModifier(attribute: Attribute, rank: Proficiency): Modifier {
    return Modifier.parse(this.modifier(attribute) + proficiencyBonus(rank, this.level));
  }

  /** Apply one field-level edit. Version bump is the repository's job. */
  public apply(patch: CharacterPatch, now: Temporal.Instant): Character {
    return new Character({ ...this.toProps(), ...this.#changes(patch), updatedAt: now });
  }

  #changes(patch: CharacterPatch): Partial<CharacterProps> {
    switch (patch.field) {
      case CharacterPatchField.Name: {
        return { name: patch.value };
      }
      case CharacterPatchField.Ancestry: {
        return { ancestry: patch.value };
      }
      case CharacterPatchField.Level: {
        return { level: patch.value };
      }
      case CharacterPatchField.Attribute: {
        return { attributes: this.attributes.with(patch.attribute, patch.value) };
      }
      default: {
        const unreachable: never = patch;
        throw new TypeError(`Unhandled character patch: ${JSON.stringify(unreachable)}`);
      }
    }
  }

  public withVersion(version: Version): Character {
    return new Character({ ...this.toProps(), version });
  }

  private toProps(): CharacterProps {
    return {
      id: this.id,
      version: this.version,
      name: this.name,
      ancestry: this.ancestry,
      level: this.level,
      attributes: this.attributes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
