import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignId } from './campaign-fields';
import {
  CoinTransferView,
  ItemTransferId,
  ItemTransferView,
  OfferCoinsBody,
  OfferItemBody,
  TransferAnswerView,
} from './campaign-item-transfers';

const ById = z.object({ id: CampaignId });
const ByTransfer = z.object({ id: CampaignId, transferId: ItemTransferId });

/** The endpoints for item transfers between a campaign's characters; `CampaignContract` includes them. */
export const CampaignItemTransferContract = {
  /**
   * A member offers an inventory line of one of their campaign characters to another character of the campaign. The line
   * stays with the giver until the offer is accepted. A giver who is not the member's, or either character outside the
   * campaign, is a 404; a key item's line, or one already on offer, a 409.
   */
  offerItem: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/transfers/items',
    params: ById,
    query: NoQuery,
    body: OfferItemBody,
    response: ItemTransferView,
  }),
  /**
   * A member offers coins of one of their campaign characters to another character of the campaign, as exact coins per
   * denomination. The coins stay with the giver until the offer is accepted. A giver who is not the member's, or either
   * character outside the campaign, is a 404; more coins than the giver holds, a 409.
   */
  offerCoins: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/transfers/coins',
    params: ById,
    query: NoQuery,
    body: OfferCoinsBody,
    response: CoinTransferView,
  }),
  /**
   * The owner of the recipient character accepts an offer: the line or coins move in one transaction that checks both
   * characters' versions. An offer that is not in the campaign, or one the user is not the recipient's owner of, is a
   * 404; one already answered or withdrawn, a changed character on either side, or a recipient with no room, a 409.
   */
  acceptTransfer: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/transfers/:transferId/accept',
    params: ByTransfer,
    query: NoQuery,
    body: NoBody,
    response: TransferAnswerView,
  }),
  /**
   * The owner of the recipient character declines an offer, which stays with the giver as it was. Not found as for
   * accepting; one already answered or withdrawn, a 409.
   */
  declineTransfer: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/transfers/:transferId/decline',
    params: ByTransfer,
    query: NoQuery,
    body: NoBody,
    response: TransferAnswerView,
  }),
  /**
   * The owner of the giver character withdraws a pending offer, which stays with the giver as it was; neither character
   * is touched. Withdrawing an offer already withdrawn changes nothing and answers the same. An offer that is not in the
   * campaign, or one the user is not the giver's owner of, is a 404; one already accepted or declined, a 409.
   */
  withdrawTransfer: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/transfers/:transferId/withdraw',
    params: ByTransfer,
    query: NoQuery,
    body: NoBody,
    response: TransferAnswerView,
  }),
} as const;
