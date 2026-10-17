import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignId, CampaignItemApprovalId } from './campaign-fields';
import { ApproveItemBody, CampaignItemReview } from './campaign-item-approvals';

const ById = z.object({ id: CampaignId });
const ByApproval = z.object({ id: CampaignId, approvalId: CampaignItemApprovalId });

/** The endpoints for a campaign's rule-breaking items (ADR-0064); `CampaignContract` includes them. */
export const CampaignItemApprovalContract = {
  /** The campaign's flagged items: the approved ones for any member, and for the GM the ones that need review. */
  itemReview: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/item-approvals',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CampaignItemReview,
  }),
  /**
   * GM only: approves a flagged item for the count it is flagged at. An item that is not flagged is a 404. Approving
   * it again, after it grew, replaces the count.
   */
  approveItem: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/item-approvals',
    params: ById,
    query: NoQuery,
    body: ApproveItemBody,
    response: CampaignItemReview,
  }),
  /** GM only: takes an approval back, which archives it (ADR-0062). Revoking twice is harmless. */
  revokeItemApproval: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/item-approvals/:approvalId',
    params: ByApproval,
    query: NoQuery,
    body: NoBody,
    response: CampaignItemReview,
  }),
} as const;
