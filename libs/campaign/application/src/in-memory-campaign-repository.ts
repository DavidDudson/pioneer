import { Campaign } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignInvite, CampaignMember } from '@pioneer/campaign/domain';
import { nextVersion } from '@pioneer/shared/kernel';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

import { CampaignRepository } from './campaign-repository';

/** A campaign with the moment the listing member joined it. */
interface Joined {
  readonly campaign: Campaign;
  readonly joinedAt: Temporal.Instant;
}

/** Repository adapter for tests and local experiments. */
export class InMemoryCampaignRepository extends CampaignRepository {
  readonly #rows = new Map<CampaignId, Campaign>();

  public override async listForMember(userId: UserId): Promise<readonly Campaign[]> {
    return [...this.#rows.values()]
      .flatMap((campaign): Joined[] => {
        const member = campaign.members.find((candidate) => candidate.userId === userId);
        return member === undefined ? [] : [{ campaign, joinedAt: member.joinedAt }];
      })
      .toSorted(
        (left, right) =>
          left.joinedAt.epochMilliseconds - right.joinedAt.epochMilliseconds ||
          left.campaign.id.localeCompare(right.campaign.id),
      )
      .map(({ campaign }) => campaign);
  }

  public override async findById(id: CampaignId): Promise<Campaign | undefined> {
    return this.#rows.get(id);
  }

  public override async insert(campaign: Campaign): Promise<Campaign> {
    this.#rows.set(campaign.id, campaign);
    return campaign;
  }

  /** Stores the member as given; checking the invite is left to the service, as nothing here races. */
  public override async joinByInvite(invite: CampaignInvite, member: CampaignMember): Promise<Campaign | undefined> {
    const campaign = this.#rows.get(invite.campaignId);
    if (campaign === undefined) {
      return undefined;
    }
    if (campaign.roleOf(member.userId) !== undefined) {
      return campaign;
    }
    const joined = new Campaign({
      id: campaign.id,
      version: nextVersion(campaign.version),
      name: campaign.name,
      gmId: campaign.gmId,
      members: [...campaign.members, member],
      createdAt: campaign.createdAt,
    });
    this.#rows.set(campaign.id, joined);
    return joined;
  }
}
