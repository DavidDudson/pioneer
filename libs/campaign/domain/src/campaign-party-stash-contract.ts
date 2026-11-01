import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignId } from './campaign-fields';
import { DepositBody, PartyStash, TakeBody } from './campaign-party-stash';

const ById = z.object({ id: CampaignId });

/** The endpoints for the party stash; `CampaignContract` includes them. */
export const CampaignPartyStashContract = {
  /** What the party holds in common. Every member reads it; not a member is a 404. */
  partyStash: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/party-stash',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: PartyStash,
  }),
  /**
   * A member puts a line of one of their campaign characters, and what it holds, into the party stash. Not a member, a
   * character outside the party or not the member's, or a line the character lacks: 404. A key item's line, or a stash
   * with no room: 409.
   */
  depositToPartyStash: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/party-stash/deposit',
    params: ById,
    query: NoQuery,
    body: DepositBody,
    response: PartyStash,
  }),
  /**
   * A member takes a line, and what it holds, from the party stash into one of their campaign characters. Any member
   * may take any line: the stash has no lock. Not a member, a character outside the party or not the member's, or a line
   * the stash lacks: 404. A character with no room: 409.
   */
  takeFromPartyStash: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/party-stash/take',
    params: ById,
    query: NoQuery,
    body: TakeBody,
    response: PartyStash,
  }),
} as const;
