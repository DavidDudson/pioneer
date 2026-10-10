import { InviteStatus } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignInvite, CampaignInviteId, InviteTokenHash } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { CampaignInviteRepository } from './campaign-invite-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCampaignInviteRepository extends CampaignInviteRepository {
  readonly #rows = new Map<CampaignInviteId, CampaignInvite>();

  public override async insert(invite: CampaignInvite): Promise<CampaignInvite> {
    this.#rows.set(invite.id, invite);
    return invite;
  }

  public override async findByTokenHash(tokenHash: InviteTokenHash): Promise<CampaignInvite | undefined> {
    return [...this.#rows.values()].find((invite) => invite.tokenHash === tokenHash);
  }

  public override async findById(id: CampaignInviteId): Promise<CampaignInvite | undefined> {
    return this.#rows.get(id);
  }

  public override async listOpen(campaignId: CampaignId, now: Temporal.Instant): Promise<readonly CampaignInvite[]> {
    return [...this.#rows.values()]
      .filter((invite) => invite.campaignId === campaignId && invite.statusAt(now) === InviteStatus.Open)
      .toSorted(
        (left, right) => Temporal.Instant.compare(right.createdAt, left.createdAt) || right.id.localeCompare(left.id),
      );
  }

  public override async revoke(invite: CampaignInvite): Promise<CampaignInvite> {
    this.#rows.set(invite.id, invite);
    return invite;
  }
}
