import { OfferedCoinsSchema } from '@pioneer/campaign/domain';
import type { CharacterId, ReviewedItemId } from '@pioneer/campaign/domain';
import { Version } from '@pioneer/shared/kernel';

import { TransferLines } from './transfer-lines';
import type { OfferableLine, OfferablePurse } from './transfer-lines';

const FIRST_VERSION = Version.parse(1);

/** The coins a test gives a character, as plain counts; the others are none. */
interface CoinsGiven {
  readonly pp?: number;
  readonly gp?: number;
  readonly sp?: number;
  readonly cp?: number;
}

/** Adapter for tests: the inventory lines and coins each character has, as the character context would keep them. */
export class InMemoryTransferLines extends TransferLines {
  readonly #lines = new Map<ReviewedItemId, { character: CharacterId; line: OfferableLine }>();
  readonly #purses = new Map<CharacterId, OfferablePurse>();

  /** The character has this inventory line; a key item's when `keyItem` is set. */
  public hasLine(character: CharacterId, item: ReviewedItemId, line: Partial<OfferableLine> = {}): this {
    this.#lines.set(item, { character, line: { keyItem: false, version: FIRST_VERSION, ...line } });
    return this;
  }

  /** The character holds these coins (the others are none), at the given version. */
  public hasCoins(character: CharacterId, coins: CoinsGiven, version: Version = FIRST_VERSION): this {
    this.#purses.set(character, { coins: OfferedCoinsSchema.parse(coins), version });
    return this;
  }

  public override async describe(character: CharacterId, item: ReviewedItemId): Promise<OfferableLine | undefined> {
    const found = this.#lines.get(item);
    return found?.character === character ? found.line : undefined;
  }

  public override async purse(character: CharacterId): Promise<OfferablePurse | undefined> {
    return this.#purses.get(character);
  }
}
