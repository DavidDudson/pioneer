import { TransferLines } from '@pioneer/campaign/application';
import type { OfferableLine } from '@pioneer/campaign/application';
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
    return this.#lines.describe(CharacterId.parse(character), InventoryItemId.parse(item));
  }
}
