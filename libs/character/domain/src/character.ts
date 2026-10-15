import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { FIRST_VERSION, InstantCodec, Version } from '@pioneer/shared/kernel';
import type { Temporal, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterDocumentSchema } from './character-document';
import type { Build, CharacterDocument } from './character-document';
import { CURRENT_SCHEMA_VERSION } from './character-document-upgrades';
import { CHARACTER_LEVEL_MIN, CharacterLevel } from './character-fields';
import type { CharacterId, CharacterName } from './character-fields';
import { CharacterPatchField, isInventoryPatch } from './character-patch';
import type { CharacterPatch, InventoryPatch, SpellAccessPatch } from './character-patch';
import { withProse } from './character-prose';
import { ANCESTRY_SLOT } from './character-slots';
import { equipmentChange } from './equipment-change';
import { inventoryRefusal, moveItem, removeItem, renameItem, setItemQuantity } from './inventory';
import type { Inventory, InventoryEdit } from './inventory';
import { withAddedItem, withAddedKit } from './item-purchase';
import type { EditInputs } from './item-purchase';
import { signatureKeyOf } from './signature-spells';

/**
 * JSON shape of a character on the wire: its document at the current schema version, plus the row's version and
 * timestamps. Nothing derived is in it: attribute modifiers are worked out from the boost picks (`attributeModifiers`).
 */
export const CharacterWire = CharacterDocumentSchema.omit({
  schemaVersion: true,
}).extend({
  version: Version,
  createdAt: InstantCodec,
  updatedAt: InstantCodec,
});

interface CharacterProps {
  /** The player's inputs; id, owner, name and level live here and are copied to the row for list queries. */
  readonly document: CharacterDocument;
  readonly version: Version;
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
 * Serialization: `Character.codec` decodes wire JSON into a `Character` and encodes it back. Use
 * `Character.codec.parse(unknown)` at trust boundaries.
 */
export class Character {
  public static readonly codec = z.codec(CharacterWire, z.instanceof(Character), {
    decode: ({ version, createdAt, updatedAt, ...document }) =>
      new Character({
        document: { ...document, schemaVersion: CURRENT_SCHEMA_VERSION },
        version,
        createdAt,
        updatedAt,
      }),
    encode: (character) => {
      const { schemaVersion: _current, ...document } = character.document;
      return {
        ...document,
        version: character.version,
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
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(input: {
    readonly id: CharacterId;
    readonly ownerId: UserId;
    readonly name: CharacterName;
    readonly ancestry: AncestryId;
    readonly level?: CharacterLevel;
    readonly choices?: Readonly<Record<SlotKey, ChoiceValue>>;
    readonly inventory?: Inventory;
    readonly now: Temporal.Instant;
  }): Character {
    return new Character({
      document: CharacterDocumentSchema.parse({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: input.id,
        ownerId: input.ownerId,
        name: input.name,
        level: input.level ?? CharacterLevel.parse(CHARACTER_LEVEL_MIN),
        build: { choices: { ...input.choices, [ANCESTRY_SLOT]: ChoiceValue.parse(input.ancestry) } },
        inventory: input.inventory,
      }),
      version: FIRST_VERSION,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /**
   * Apply one edit. Version bump is the repository's job. An added item takes `inputs.newItemId`, an added kit adds
   * `inputs.kitItems` and a bought one costs `inputs.cost`, which the caller works out, as it gives `now`. An edit that
   * leaves the document invalid (an inventory edit `inventoryRefusal` refuses, an add with no id or lines, a purchase
   * with no cost or one the coins don't cover) is a caller's bug and throws before anything is stored; the service
   * checks edits first.
   */
  public apply(patch: CharacterPatch, now: Temporal.Instant, inputs: EditInputs = {}): Character {
    const { document } = { ...this.toProps(), ...this.#changes(patch, inputs) };
    const checked = CharacterDocumentSchema.safeParse(document);
    if (!checked.success) {
      throw new TypeError(`Edit ${patch.field} leaves the document invalid: ${z.prettifyError(checked.error)}`);
    }
    return new Character({ ...this.toProps(), document, updatedAt: now });
  }

  #changes(patch: CharacterPatch, inputs: EditInputs): Partial<CharacterProps> {
    if (isInventoryPatch(patch)) {
      return this.#stockChanges(patch, inputs);
    }
    switch (patch.field) {
      case CharacterPatchField.Name: {
        return { document: { ...this.document, name: patch.value } };
      }
      case CharacterPatchField.Level: {
        return { document: { ...this.document, level: patch.value } };
      }
      case CharacterPatchField.SelectSlot: {
        return { document: this.#choose(patch.slot, patch.selection, inputs) };
      }
      case CharacterPatchField.ClearSlot: {
        return { document: this.#clear(patch.slot, inputs) };
      }
      case CharacterPatchField.CarryItem:
      case CharacterPatchField.InvestItem:
      case CharacterPatchField.SetItemBroken:
      case CharacterPatchField.EtchRune:
      case CharacterPatchField.EraseRune:
      case CharacterPatchField.TransferRune: {
        return this.#stock(patch, (inventory) => equipmentChange(inventory, patch));
      }
      case CharacterPatchField.GrantSpellAccess:
      case CharacterPatchField.RevokeSpellAccess: {
        return this.#accessChanges(patch);
      }
      case CharacterPatchField.SetAppearance:
      case CharacterPatchField.SetPersonality: {
        return { document: withProse(this.document, patch) };
      }
      default: {
        const unreachable: never = patch;
        throw new TypeError(`Unhandled character patch: ${JSON.stringify(unreachable)}`);
      }
    }
  }

  /** The inventory edits, each checked by `#stock`. */
  #stockChanges(patch: InventoryPatch, inputs: EditInputs): Partial<CharacterProps> {
    switch (patch.field) {
      case CharacterPatchField.GiftItem:
      case CharacterPatchField.BuyItem: {
        return this.#stock(patch, (inventory) => withAddedItem(inventory, patch, inputs));
      }
      case CharacterPatchField.GiftKit:
      case CharacterPatchField.BuyKit: {
        return this.#stock(patch, (inventory) => withAddedKit(inventory, patch, inputs));
      }
      case CharacterPatchField.RemoveItem: {
        return this.#stock(patch, (inventory) => removeItem(inventory, patch.id));
      }
      case CharacterPatchField.SetItemQuantity: {
        return this.#stock(patch, (inventory) => setItemQuantity(inventory, patch.id, patch.quantity));
      }
      case CharacterPatchField.MoveItem: {
        return this.#stock(patch, (inventory) => moveItem(inventory, patch.id, patch.container));
      }
      case CharacterPatchField.RenameItem: {
        return this.#stock(patch, (inventory) => renameItem(inventory, patch.id, patch.name));
      }
      case CharacterPatchField.SetCoins: {
        return {
          document: {
            ...this.document,
            inventory: { ...this.document.inventory, coins: patch.coins },
          },
        };
      }
      default: {
        const unreachable: never = patch;
        throw new TypeError(`Unhandled character patch: ${JSON.stringify(unreachable)}`);
      }
    }
  }

  /** The document with its inventory changed by `change`, once the inventory allows `edit`. */
  #stock(edit: InventoryEdit, change: (inventory: Inventory) => Inventory): Partial<CharacterProps> {
    const refusal = inventoryRefusal(this.document.inventory, edit);
    if (refusal !== undefined) {
      throw new TypeError(`Refused inventory edit: ${refusal.message.key}`);
    }
    return {
      document: {
        ...this.document,
        inventory: change(this.document.inventory),
      },
    };
  }

  /** The build's spell access with `patch.spell` added at the end unless listed, or taken out; a pick of a spell taken out stays (#478). */
  #accessChanges(patch: SpellAccessPatch): Partial<CharacterProps> {
    const { build } = this.document;
    const listed = build.spellAccess.includes(patch.spell);
    const granted = listed ? build.spellAccess : [...build.spellAccess, patch.spell];
    const spellAccess =
      patch.field === CharacterPatchField.GrantSpellAccess
        ? granted
        : build.spellAccess.filter((spell) => spell !== patch.spell);
    return { document: { ...this.document, build: { ...build, spellAccess } } };
  }

  #choose(slot: SlotKey, value: ChoiceValue, inputs: EditInputs): CharacterDocument {
    const { build } = this.document;
    const choices: Record<SlotKey, ChoiceValue> = { ...build.choices, [slot]: value };
    const old = build.choices[slot];
    if (inputs.countsAsSwap !== true || old === undefined) {
      return { ...this.document, build: { ...build, choices } };
    }
    const signature = signatureKeyOf(slot);
    if (signature !== undefined && choices[signature] === old) {
      choices[signature] = value;
    }
    return { ...this.document, build: { ...build, choices, repertoireSwaps: this.#swapped(slot) } };
  }

  /** The swaps with `slot` recorded at the character's level. */
  #swapped(slot: SlotKey): Build['repertoireSwaps'] {
    const { level, build } = this.document;
    return [...build.repertoireSwaps.filter((each) => each.level !== level), { level, slot }];
  }

  /** The document without a selection for `slot`; every other pick, shown or hidden, stays. */
  #clear(slot: SlotKey, inputs: EditInputs = {}): CharacterDocument {
    const { build } = this.document;
    const { [slot]: _cleared, ...choices } = build.choices;
    const repertoireSwaps = inputs.countsAsSwap === true ? this.#swapped(slot) : build.repertoireSwaps;
    return { ...this.document, build: { ...build, choices, repertoireSwaps } };
  }

  public withVersion(version: Version): Character {
    return new Character({ ...this.toProps(), version });
  }

  /** This character with `inventory` in place of its own, as a play edit that breaks or destroys an item leaves it. */
  public withInventory(inventory: Inventory, now: Temporal.Instant): Character {
    return new Character({
      ...this.toProps(),
      document: { ...this.document, inventory },
      updatedAt: now,
    });
  }

  private toProps(): CharacterProps {
    return {
      document: this.document,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
