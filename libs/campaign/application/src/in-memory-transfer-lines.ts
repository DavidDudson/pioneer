import type { CharacterId, ReviewedItemId } from '@pioneer/campaign/domain';
import { Version } from '@pioneer/shared/kernel';

import { TransferLines } from './transfer-lines';
import type { OfferableLine } from './transfer-lines';

const FIRST_VERSION = Version.parse(1);

/** Adapter for tests: the inventory lines each character has, as the character context would keep them. */
export class InMemoryTransferLines extends TransferLines {
  readonly #lines = new Map<ReviewedItemId, { character: CharacterId; line: OfferableLine }>();

  /** The character has this inventory line; a key item's when `keyItem` is set. */
  public hasLine(character: CharacterId, item: ReviewedItemId, line: Partial<OfferableLine> = {}): this {
    this.#lines.set(item, { character, line: { keyItem: false, version: FIRST_VERSION, ...line } });
    return this;
  }

  public override async describe(character: CharacterId, item: ReviewedItemId): Promise<OfferableLine | undefined> {
    const found = this.#lines.get(item);
    return found?.character === character ? found.line : undefined;
  }
}
