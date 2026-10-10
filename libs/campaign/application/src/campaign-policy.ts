import { CampaignRole } from '@pioneer/campaign/domain';
import type { Campaign } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Who may see a campaign (ADR-0007): its members. Services treat a refusal as not found, so the ids
 * of campaigns a user is not in reveal nothing.
 */
export function mayViewCampaign(actor: UserId, campaign: Campaign): boolean {
  return campaign.roleOf(actor) !== undefined;
}

/** Who may create, list and revoke a campaign's invites: its GM. */
export function mayManageInvites(actor: UserId, campaign: Campaign): boolean {
  return campaign.roleOf(actor) === CampaignRole.Gm;
}
