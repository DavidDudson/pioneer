import { Campaign, CampaignId, CampaignMemberId, CampaignRole } from '@pioneer/campaign/domain';
import type { CampaignRoster, CreateCampaignBody, NamedMember, TransferGmBody } from '@pioneer/campaign/domain';
import { ForbiddenError, message, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CampaignInviteRepository } from './campaign-invite-repository';
import { mayLeaveCampaign, mayManageMembers, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { MemberDirectory } from './member-directory';
import { MemberMessage } from './member-message';

/** The ports `CampaignService` works through. */
export interface CampaignPorts {
  readonly campaigns: CampaignRepository;
  /** Removing a member revokes the campaign's open invites. */
  readonly invites: CampaignInviteRepository;
  readonly directory: MemberDirectory;
}

/**
 * Campaign use cases. Framework-free: the HTTP adapter calls these with the signed-in user as
 * `actor`. Every use case applies the access policy here, never in routes.
 */
export class CampaignService {
  readonly #repository: CampaignRepository;
  readonly #invites: CampaignInviteRepository;
  readonly #directory: MemberDirectory;
  readonly #clock: Clock;

  public constructor({ campaigns, invites, directory }: CampaignPorts, clock: Clock) {
    this.#repository = campaigns;
    this.#invites = invites;
    this.#directory = directory;
    this.#clock = clock;
  }

  /** Every campaign the actor is a member of, as GM or player. */
  public async list(actor: UserId): Promise<readonly Campaign[]> {
    return this.#repository.listForMember(actor);
  }

  /** One of the actor's campaigns. One they are not in is a 404, the same as a missing one. */
  public async get(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.#repository.findById(id);
    if (campaign === undefined || !mayViewCampaign(actor, campaign)) {
      throw new NotFoundError('Campaign', id);
    }
    return campaign;
  }

  /** One of the actor's campaigns' members with their names, and the actor's role in it. */
  public async roster(actor: UserId, id: CampaignId): Promise<CampaignRoster> {
    const campaign = await this.get(actor, id);
    return this.#rosterOf(actor, campaign);
  }

  /** A new campaign with the actor as its GM. */
  public async create(actor: UserId, input: CreateCampaignBody): Promise<Campaign> {
    const campaign = Campaign.create({
      id: CampaignId.parse(newId()),
      gmMemberId: CampaignMemberId.parse(newId()),
      gmId: actor,
      name: input.name,
      now: this.#clock.now(),
    });
    return this.#repository.insert(campaign);
  }

  /**
   * The GM takes a player out of the campaign; they lose access at once. The campaign's open invites
   * are revoked first, so the player can't rejoin with a link they already have (a join holds the
   * invite's lock, so none slips in between). A member already gone is no change, so removing someone
   * twice is harmless. The GM can't remove themselves.
   */
  public async removeMember(actor: UserId, id: CampaignId, memberId: CampaignMemberId): Promise<CampaignRoster> {
    const campaign = await this.#managedCampaign(actor, id);
    const member = campaign.memberById(memberId);
    if (member === undefined) {
      return this.#rosterOf(actor, campaign);
    }
    if (member.role === CampaignRole.Gm) {
      throw new ForbiddenError(`The GM of campaign ${id} can't be removed`, message(MemberMessage.GmNotRemovable));
    }
    await this.#invites.revokeOpen(id, this.#clock.now());
    const saved = await this.#repository.updateMembers(campaign.withoutMember(memberId), campaign.version);
    return this.#rosterOf(actor, saved);
  }

  /** The GM hands the role to another member and stays on as a player. Handing it to themselves changes nothing. */
  public async transferGm(actor: UserId, id: CampaignId, { memberId }: TransferGmBody): Promise<CampaignRoster> {
    const campaign = await this.#managedCampaign(actor, id);
    if (campaign.memberById(memberId) === undefined) {
      throw new NotFoundError('CampaignMember', memberId);
    }
    const handed = campaign.withGm(memberId);
    const saved = handed === campaign ? campaign : await this.#repository.updateMembers(handed, campaign.version);
    return this.#rosterOf(actor, saved);
  }

  /** A player leaves the campaign. The GM hands the role over first, so a campaign always has one. */
  public async leave(actor: UserId, id: CampaignId): Promise<void> {
    const campaign = await this.get(actor, id);
    const member = campaign.members.find((candidate) => candidate.userId === actor);
    if (member === undefined || !mayLeaveCampaign(actor, campaign)) {
      throw new ForbiddenError(`The GM of campaign ${id} can't leave it`, message(MemberMessage.GmCannotLeave));
    }
    await this.#repository.updateMembers(campaign.withoutMember(member.id), campaign.version);
  }

  /** The campaign's members with their names, as the actor sees them. */
  async #rosterOf(actor: UserId, campaign: Campaign): Promise<CampaignRoster> {
    const viewerRole = campaign.roleOf(actor);
    if (viewerRole === undefined) {
      throw new NotFoundError('Campaign', campaign.id);
    }
    const names = await this.#directory.displayNames(campaign.members.map((member) => member.userId));
    // Memberships cascade with their user, so a missing name is an account deleted since the campaign loaded.
    const members = campaign.members.flatMap((member): NamedMember[] => {
      const displayName = names.get(member.userId);
      return displayName === undefined ? [] : [{ ...member, displayName }];
    });
    return { viewerRole, members };
  }

  /**
   * The campaign, when the actor is its GM. Not a member: 404, so its existence doesn't leak
   * (ADR-0007). A player: 403, as they already know it exists.
   */
  async #managedCampaign(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.get(actor, id);
    if (!mayManageMembers(actor, campaign)) {
      throw new ForbiddenError(`Only the GM manages the members of campaign ${id}`);
    }
    return campaign;
  }
}
