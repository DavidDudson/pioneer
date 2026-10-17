import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignId } from './campaign-fields';
import { CampaignRuleLimits, RuleLimitKeySchema, SetRuleLimitBody } from './campaign-rule-limits';

const ById = z.object({ id: CampaignId });
const ByRuleLimit = z.object({ id: CampaignId, limit: RuleLimitKeySchema });

/** The endpoints for a campaign's table limits (ADR-0064); `CampaignContract` includes them. */
export const CampaignRuleLimitContract = {
  /** The table limits of the campaign: every one, with the number in force and the core rules' number. */
  ruleLimits: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/rule-limits',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CampaignRuleLimits,
  }),
  /** GM only: sets one limit. A number past the limit's ceiling is a 422. Setting the same number twice is harmless. */
  setRuleLimit: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/rule-limits/:limit',
    params: ByRuleLimit,
    query: NoQuery,
    body: SetRuleLimitBody,
    response: CampaignRuleLimits,
  }),
  /** GM only: returns one limit to the core rules' number. Resetting it twice is harmless. */
  resetRuleLimit: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/rule-limits/:limit',
    params: ByRuleLimit,
    query: NoQuery,
    body: NoBody,
    response: CampaignRuleLimits,
  }),
} as const;
