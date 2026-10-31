import { TransferLines } from '@pioneer/campaign/application';
import type { OfferableLine, OfferablePurse } from '@pioneer/campaign/application';
import { OfferedCoinsSchema, ReviewedName } from '@pioneer/campaign/domain';
import type { CharacterId as CampaignCharacterId, ReviewedItemId } from '@pioneer/campaign/domain';
import type { CharacterTransferLines } from '@pioneer/character/application';
import { CharacterId, InventoryItemId } from '@pioneer/character/domain';

/**
 * The campaign context's `TransferLines` over the character context. It lives in the composition root because neither
 * context may import the other.
 */
export class CharacterTransferLinesAdapter extends TransferLines {
  readonly #lines: CharacterTransferLines;

  public constructor(lines: CharacterTransferLines) {
    super();
    this.#lines = lines;
  }

  public override async describe(
    character: CampaignCharacterId,
    item: ReviewedItemId,
  ): Promise<OfferableLine | undefined> {
    const found = await this.#lines.describe(CharacterId.parse(character), InventoryItemId.parse(item));
    return found === undefined
      ? undefined
      : {
          ...found,
          name: ReviewedName.parse(found.name),
          contents: found.contents.map((each) => ReviewedName.parse(each)),
        };
  }

  public override async purse(character: CampaignCharacterId): Promise<OfferablePurse | undefined> {
    const found = await this.#lines.purse(CharacterId.parse(character));
    return found === undefined ? undefined : { coins: OfferedCoinsSchema.parse(found.coins), version: found.version };
  }
}
