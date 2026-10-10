import type { Campaign, CampaignId, CampaignMember } from '@pioneer/campaign/domain';
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

  public override async addMember(id: CampaignId, member: CampaignMember): Promise<Campaign> {
    const campaign = this.#rows.get(id);
    if (campaign === undefined) {
      throw new Error(`No campaign ${id} to add a member to`);
    }
    const joined = campaign.withPlayer({ memberId: member.id, userId: member.userId, now: member.joinedAt });
    this.#rows.set(id, joined);
    return joined;
  }
}
