import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterId } from './character-fields';
import {
  CharacterRuleLimitSettings,
  RuleLimitFieldSchema,
  SetRuleLimitSettingBody,
} from './character-rule-limit-settings';
import { CharacterItemApprovals } from './item-approvals';

const ById = z.object({ id: CharacterId });
const ByRuleLimit = z.object({ id: CharacterId, limit: RuleLimitFieldSchema });

/**
 * The endpoints for the table limits a character sets for itself (ADR-0064); `CharacterContract` includes them. The
 * limits in force, worked out for the sheet, are `CharacterContract.ruleLimits`.
 */
export const CharacterRuleLimitContract = {
  /** The rule-breaking lines the character's campaign approved, which silence their warnings. Owner only: 404 otherwise. */
  itemApprovals: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/item-approvals',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterItemApprovals,
  }),
  /** Every limit of the character with the number in force, and who decides them. Owner only; anyone else gets a 404. */
  ruleLimitSettings: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/rule-limit-settings',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterRuleLimitSettings,
  }),
  /**
   * Owner only: sets one limit. A character in a campaign is held to the campaign's limits, so that is a 409. A number
   * past the limit's ceiling is a 422. Setting the same number twice is harmless.
   */
  setRuleLimitSetting: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/:id/rule-limit-settings/:limit',
    params: ByRuleLimit,
    query: NoQuery,
    body: SetRuleLimitSettingBody,
    response: CharacterRuleLimitSettings,
  }),
  /** Owner only: returns one limit to the core rules' number; a 409 in a campaign. Resetting it twice is harmless. */
  resetRuleLimitSetting: new Endpoint({
    method: HttpMethod.Delete,
    path: '/characters/:id/rule-limit-settings/:limit',
    params: ByRuleLimit,
    query: NoQuery,
    body: NoBody,
    response: CharacterRuleLimitSettings,
  }),
} as const;
