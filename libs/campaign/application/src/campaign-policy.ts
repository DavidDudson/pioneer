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

/** Who may remove players and hand the GM role over: the GM. */
export function mayManageMembers(actor: UserId, campaign: Campaign): boolean {
  return campaign.roleOf(actor) === CampaignRole.Gm;
}

/** Who may leave: a player. The GM hands the role over first, so a campaign always has one. */
export function mayLeaveCampaign(actor: UserId, campaign: Campaign): boolean {
  return campaign.roleOf(actor) === CampaignRole.Player;
}

/**
 * Who may bring a character into a campaign: a member who owns it. Services treat someone else's
 * character as not found, so its id reveals nothing (as for characters themselves).
 */
export function mayAttachCharacter(actor: UserId, campaign: Campaign, ownerId: UserId): boolean {
  return campaign.roleOf(actor) !== undefined && ownerId === actor;
}

/** Who may take a character out of a campaign: its owner, or the GM. */
export function mayDetachCharacter(actor: UserId, campaign: Campaign, ownerId: UserId): boolean {
  const role = campaign.roleOf(actor);
  return role === CampaignRole.Gm || (role !== undefined && ownerId === actor);
}
