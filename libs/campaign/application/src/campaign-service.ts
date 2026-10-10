import { Campaign, CampaignId, CampaignMemberId } from '@pioneer/campaign/domain';
import type { CampaignRoster, CreateCampaignBody, NamedMember } from '@pioneer/campaign/domain';
import { newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { MemberDirectory } from './member-directory';

/**
 * Campaign use cases. Framework-free: the HTTP adapter calls these with the signed-in user as
 * `actor`. Every use case applies the access policy here, never in routes.
 */
export class CampaignService {
  readonly #repository: CampaignRepository;
  readonly #directory: MemberDirectory;
  readonly #clock: Clock;

  public constructor(repository: CampaignRepository, directory: MemberDirectory, clock: Clock) {
    this.#repository = repository;
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
    const viewerRole = campaign.roleOf(actor);
    if (viewerRole === undefined) {
      throw new NotFoundError('Campaign', id);
    }
    const names = await this.#directory.displayNames(campaign.members.map((member) => member.userId));
    // Memberships cascade with their user, so a missing name is an account deleted since the campaign loaded.
    const members = campaign.members.flatMap((member): NamedMember[] => {
      const displayName = names.get(member.userId);
      return displayName === undefined ? [] : [{ ...member, displayName }];
    });
    return { viewerRole, members };
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
}
