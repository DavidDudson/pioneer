import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignId } from './campaign-fields';
import { CampaignKeyItems, CreateKeyItemBody, GiveKeyItemBody, KeyItemId, PromoteItemBody } from './campaign-key-items';

const ById = z.object({ id: CampaignId });
const ByKeyItem = z.object({ id: CampaignId, keyItemId: KeyItemId });

/** The endpoints for a campaign's key items; `CampaignContract` includes them. */
export const CampaignKeyItemContract = {
  /** The campaign's key items and who holds them, for any member. */
  keyItems: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/key-items',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CampaignKeyItems,
  }),
  /** GM only: creates a key item, held by the party stash until the GM gives it to a character. */
  createKeyItem: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/key-items',
    params: ById,
    query: NoQuery,
    body: CreateKeyItemBody,
    response: CampaignKeyItems,
  }),
  /**
   * GM only: turns a flagged item into a key item held by its character: the key item copies the base item, runes and
   * name, and the character's line becomes linked to it, no second line added. A line that is not flagged (stale, or
   * already a key item's) is a 404 or 409. Promoting it again is harmless.
   */
  promoteKeyItem: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/key-items/promote',
    params: ById,
    query: NoQuery,
    body: PromoteItemBody,
    response: CampaignKeyItems,
  }),
  /**
   * GM only: gives the key item to a character in the party, or moves it from the one holding it: the old holder's
   * line goes and the new holder gets one. A character outside the party is a 404. Giving it to its holder is harmless.
   */
  giveKeyItem: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/key-items/:keyItemId/holder',
    params: ByKeyItem,
    query: NoQuery,
    body: GiveKeyItemBody,
    response: CampaignKeyItems,
  }),
  /** GM only: takes the key item back to the party stash, removing the holder's line. Taking it back twice is harmless. */
  takeBackKeyItem: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/key-items/:keyItemId/holder',
    params: ByKeyItem,
    query: NoQuery,
    body: NoBody,
    response: CampaignKeyItems,
  }),
  /** GM only: archives the key item (ADR-0062), removing the holder's line. Archiving twice is harmless. */
  archiveKeyItem: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/key-items/:keyItemId/archive',
    params: ByKeyItem,
    query: NoQuery,
    body: NoBody,
    response: CampaignKeyItems,
  }),
} as const;
