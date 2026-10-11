import { AncestryId, AttributeModifiers, ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import type { Attribute, AttributeModifier } from '@pioneer/rules/sdk';
import { FIRST_VERSION, InstantCodec, Version } from '@pioneer/shared/kernel';
import type { Temporal, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterDocumentSchema } from './character-document';
import type { CharacterDocument } from './character-document';
import { CURRENT_SCHEMA_VERSION } from './character-document-upgrades';
import { CHARACTER_LEVEL_MIN, CharacterLevel } from './character-fields';
import type { CharacterId, CharacterName } from './character-fields';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';

/** The slot the character's ancestry is picked in (character-model.md, "Choice slots"). */
const ANCESTRY_SLOT = SlotKey.parse('ancestry');

/**
 * JSON shape of a character on the wire: its document at the current schema version, plus the row's version and
 * timestamps. `attributes` is stored apart until #418 works the modifiers out from boost picks.
 */
export const CharacterWire = CharacterDocumentSchema.omit({ schemaVersion: true }).extend({
  version: Version,
  attributes: AttributeModifiers.codec,
  createdAt: InstantCodec,
  updatedAt: InstantCodec,
});

interface CharacterProps {
  /** The player's inputs; id, owner, name and level live here and are copied to the row for list queries. */
  readonly document: CharacterDocument;
  readonly version: Version;
  readonly attributes: AttributeModifiers;
  readonly createdAt: Temporal.Instant;
  readonly updatedAt: Temporal.Instant;
}

/** The ancestry picked in the ancestry slot, or `undefined` while the slot is empty. */
function ancestryOf(document: CharacterDocument): AncestryId | undefined {
  const picked = AncestryId.safeParse(document.build.choices[ANCESTRY_SLOT]);
  return picked.success ? picked.data : undefined;
}

/**
 * Character aggregate root, stored as its `CharacterDocument`. Immutable: every change returns a new instance,
 * which is what Angular signals want and what keeps server-side invariants in one place.
 *
 * Serialization: `Character.codec` decodes wire JSON into a `Character` and
 * encodes it back. Use `Character.codec.parse(unknown)` at trust boundaries.
 */
export class Character {
  public static readonly codec = z.codec(CharacterWire, z.instanceof(Character), {
    decode: ({ version, attributes, createdAt, updatedAt, ...document }) =>
      new Character({
        document: { ...document, schemaVersion: CURRENT_SCHEMA_VERSION },
        version,
        attributes,
        createdAt,
        updatedAt,
      }),
    encode: (character) => {
      const { schemaVersion: _current, ...document } = character.document;
      return {
        ...document,
        version: character.version,
        attributes: character.attributes,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      };
    },
  });

  public readonly document: CharacterDocument;
  public readonly version: Version;
  public readonly id: CharacterId;
  /** The user who created it; only they may see or change it. */
  public readonly ownerId: UserId;
  public readonly name: CharacterName;
  public readonly ancestry: AncestryId | undefined;
  public readonly level: CharacterLevel;
  public readonly attributes: AttributeModifiers;
  public readonly createdAt: Temporal.Instant;
  public readonly updatedAt: Temporal.Instant;

  public constructor(props: CharacterProps) {
    this.document = props.document;
    this.version = props.version;
    this.id = props.document.id;
    this.ownerId = props.document.ownerId;
    this.name = props.document.name;
    this.ancestry = ancestryOf(props.document);
    this.level = props.document.level;
    this.attributes = props.attributes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(input: {
    readonly id: CharacterId;
    readonly ownerId: UserId;
    readonly name: CharacterName;
    readonly ancestry: AncestryId;
    /** Level 1 unless given, as when importing a built character. */
    readonly level?: CharacterLevel;
    /** All +0 unless given. */
    readonly attributes?: AttributeModifiers;
    readonly now: Temporal.Instant;
  }): Character {
    return new Character({
      document: CharacterDocumentSchema.parse({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: input.id,
        ownerId: input.ownerId,
        name: input.name,
        level: input.level ?? CharacterLevel.parse(CHARACTER_LEVEL_MIN),
        build: { choices: { [ANCESTRY_SLOT]: ChoiceValue.parse(input.ancestry) } },
      }),
      version: FIRST_VERSION,
      attributes: input.attributes ?? AttributeModifiers.none,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  public modifier(attribute: Attribute): AttributeModifier {
    return this.attributes.get(attribute);
  }

  /** Apply one field-level edit. Version bump is the repository's job. */
  public apply(patch: CharacterPatch, now: Temporal.Instant): Character {
    return new Character({ ...this.toProps(), ...this.#changes(patch), updatedAt: now });
  }

  #changes(patch: CharacterPatch): Partial<CharacterProps> {
    switch (patch.field) {
      case CharacterPatchField.Name: {
        return { document: { ...this.document, name: patch.value } };
      }
      case CharacterPatchField.Ancestry: {
        return { document: this.#choose(ANCESTRY_SLOT, ChoiceValue.parse(patch.value)) };
      }
      case CharacterPatchField.Level: {
        return { document: { ...this.document, level: patch.value } };
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

  #choose(slot: SlotKey, value: ChoiceValue): CharacterDocument {
    const { build } = this.document;
    return { ...this.document, build: { ...build, choices: { ...build.choices, [slot]: value } } };
  }

  public withVersion(version: Version): Character {
    return new Character({ ...this.toProps(), version });
  }

  private toProps(): CharacterProps {
    return {
      document: this.document,
      version: this.version,
      attributes: this.attributes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
