import { KeyItemHolders } from '@pioneer/campaign/application';
import type { CampaignKeyItem, CharacterId as CampaignCharacterId } from '@pioneer/campaign/domain';
import type { CharacterKeyItems } from '@pioneer/character/application';
import {
  CharacterId,
  InventoryItemId,
  InventoryItemName,
  ItemQuantity,
  ItemRunesSchema,
  KeyItemId,
} from '@pioneer/character/domain';
import type { ItemRunes, KeyItemLine } from '@pioneer/character/domain';
import { ContentId } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

const ONE = ItemQuantity.parse(1);

/** The runes a key item states, as an inventory line holds them: the property runes by content id. */
function runesOf({ runes }: CampaignKeyItem): ItemRunes {
  return ItemRunesSchema.parse({ ...runes, property: runes.property.map(({ rune }) => rune) });
}

/** The inventory line a key item puts in its holder's hands: one of the base item, named for the key item. */
export function lineOf(keyItem: CampaignKeyItem): KeyItemLine {
  return {
    id: InventoryItemId.parse(newId()),
    keyItem: KeyItemId.parse(keyItem.id),
    item: ContentId.parse(keyItem.base.item),
    quantity: ONE,
    name: InventoryItemName.parse(keyItem.name),
    runes: runesOf(keyItem),
  };
}

/**
 * The campaign context's `KeyItemHolders` over the character context: giving a key item adds a line to the holder's
 * inventory linked to it, taking it back removes the line. It lives in the composition root because neither context
 * may import the other.
 */
export class CharacterKeyItemHolders extends KeyItemHolders {
  readonly #keyItems: CharacterKeyItems;

  public constructor(keyItems: CharacterKeyItems) {
    super();
    this.#keyItems = keyItems;
  }

  public override async give(actor: UserId, character: CampaignCharacterId, keyItem: CampaignKeyItem): Promise<void> {
    await this.#keyItems.give(actor, CharacterId.parse(character), lineOf(keyItem));
  }

  public override async takeBack(
    actor: UserId,
    character: CampaignCharacterId,
    keyItem: CampaignKeyItem,
  ): Promise<void> {
    await this.#keyItems.takeBack(actor, CharacterId.parse(character), KeyItemId.parse(keyItem.id));
  }
}
