import { Endpoint, HttpMethod, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignId } from './campaign-fields';
import { CoinTransferView, ItemTransferView, OfferCoinsBody, OfferItemBody } from './campaign-item-transfers';

const ById = z.object({ id: CampaignId });

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
} as const;
