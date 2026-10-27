import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { Temporal, Version } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterId } from './campaign-fields';
import { ReviewedItemId } from './campaign-item-approvals';

/** One transfer offer between two characters of a campaign. */
export const ItemTransferId = Uuid.brand<'ItemTransferId'>();
export type ItemTransferId = z.infer<typeof ItemTransferId>;

/** Where an offer stands. Only a pending one can be answered or withdrawn; the others are kept as history. */
export const TransferStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Declined: 'declined',
  Withdrawn: 'withdrawn',
} as const;
export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

/** An offer of one inventory line from one campaign character to another; the line stays with the giver until accepted. */
export interface ItemTransfer {
  readonly id: ItemTransferId;
  readonly from: CharacterId;
  readonly to: CharacterId;
  /** The giver's inventory line on offer. */
  readonly item: ReviewedItemId;
  /** The giver's character version when the offer was made, checked again when it is accepted. */
  readonly giverVersion: Version;
  readonly status: TransferStatus;
  readonly createdAt: Temporal.Instant;
}

/** Which line the member offers, and to whom. The giver is one of the member's own characters. */
export const OfferItemBody = z.object({ from: CharacterId, to: CharacterId, item: ReviewedItemId });
export type OfferItemBody = z.output<typeof OfferItemBody>;

/** One offer as the campaign shows it. */
export const ItemTransferView = z.object({
  id: ItemTransferId,
  from: CharacterId,
  to: CharacterId,
  item: ReviewedItemId,
  status: z.enum(TransferStatus),
});
export type ItemTransferView = z.output<typeof ItemTransferView>;

/** How many of one coin an offer carries; like the character's own purse, a hoard runs past a smallint. */
export const OfferedCoinAmount = Pg.integer().nonnegative().brand<'OfferedCoinAmount'>();
export type OfferedCoinAmount = z.infer<typeof OfferedCoinAmount>;

const NO_COINS = OfferedCoinAmount.parse(0);

/** The coins an offer hands over, per denomination, exactly as given: nothing is made into change. */
export const OfferedCoinsSchema = z.strictObject({
  pp: OfferedCoinAmount.default(NO_COINS),
  gp: OfferedCoinAmount.default(NO_COINS),
  sp: OfferedCoinAmount.default(NO_COINS),
  cp: OfferedCoinAmount.default(NO_COINS),
});
export type OfferedCoins = z.output<typeof OfferedCoinsSchema>;

/** Whether the offer carries at least one coin; an empty one is no offer. */
function hasCoins({ pp, gp, sp, cp }: OfferedCoins): boolean {
  return pp + gp + sp + cp > 0;
}

/** An offer of coins from one campaign character to another; the coins stay with the giver until accepted. */
export interface CoinTransfer {
  readonly id: ItemTransferId;
  readonly from: CharacterId;
  readonly to: CharacterId;
  readonly coins: OfferedCoins;
  /** The giver's character version when the offer was made, checked again when it is accepted. */
  readonly giverVersion: Version;
  readonly status: TransferStatus;
  readonly createdAt: Temporal.Instant;
}

/** Which coins the member offers, and to whom. The giver is one of the member's own characters. */
export const OfferCoinsBody = z.object({
  from: CharacterId,
  to: CharacterId,
  coins: OfferedCoinsSchema.refine(hasCoins, { error: 'An offer carries at least one coin' }),
});
export type OfferCoinsBody = z.output<typeof OfferCoinsBody>;

/** One coin offer as the campaign shows it. */
export const CoinTransferView = z.object({
  id: ItemTransferId,
  from: CharacterId,
  to: CharacterId,
  coins: OfferedCoinsSchema,
  status: z.enum(TransferStatus),
});
export type CoinTransferView = z.output<typeof CoinTransferView>;
