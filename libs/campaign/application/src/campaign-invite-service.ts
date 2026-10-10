import {
  CampaignInvite,
  CampaignInviteId,
  CampaignMemberId,
  InviteStatus,
  InviteToken,
  InviteTokenHash,
} from '@pioneer/campaign/domain';
import type { Campaign, CampaignId, InviteSummary, IssuedInvite } from '@pioneer/campaign/domain';
import {
  ForbiddenError,
  GoneError,
  message,
  newId,
  NotFoundError,
  randomSecret,
  sha256Hex,
} from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CampaignInviteRepository } from './campaign-invite-repository';
import { mayManageInvites, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import { InviteMessage } from './invite-message';

/** The message for each reason an invite no longer works. */
const CLOSED_MESSAGE = {
  [InviteStatus.Expired]: InviteMessage.Expired,
  [InviteStatus.Revoked]: InviteMessage.Revoked,
} as const;

/** An invite and the campaign it lets someone join. */
interface Invited {
  readonly invite: CampaignInvite;
  readonly campaign: Campaign;
}

async function hashToken(token: InviteToken): Promise<InviteTokenHash> {
  return InviteTokenHash.parse(await sha256Hex(token));
}

/**
 * Invite links and joining by one. The GM issues, lists and revokes invites; anyone signed in
 * who presents a working token joins as a player. Framework-free, like `CampaignService`.
 */
export class CampaignInviteService {
  readonly #campaigns: CampaignRepository;
  readonly #invites: CampaignInviteRepository;
  readonly #clock: Clock;

  public constructor(campaigns: CampaignRepository, invites: CampaignInviteRepository, clock: Clock) {
    this.#campaigns = campaigns;
    this.#invites = invites;
    this.#clock = clock;
  }

  /** The campaign's invites that still work, newest first. */
  public async list(actor: UserId, campaignId: CampaignId): Promise<readonly InviteSummary[]> {
    await this.#managedCampaign(actor, campaignId);
    const invites = await this.#invites.listOpen(campaignId, this.#clock.now());
    return invites.map((invite) => invite.toSummary());
  }

  /** A new invite; its token is returned here once and never stored. */
  public async create(actor: UserId, campaignId: CampaignId): Promise<IssuedInvite> {
    await this.#managedCampaign(actor, campaignId);
    const token = InviteToken.parse(randomSecret());
    const invite = CampaignInvite.issue({
      id: CampaignInviteId.parse(newId()),
      campaignId,
      tokenHash: await hashToken(token),
      createdBy: actor,
      now: this.#clock.now(),
    });
    const stored = await this.#invites.insert(invite);
    return { invite: stored.toSummary(), token };
  }

  /** Stops the invite working. An invite of another campaign is a 404, as if it did not exist. */
  public async revoke(actor: UserId, campaignId: CampaignId, inviteId: CampaignInviteId): Promise<InviteSummary> {
    await this.#managedCampaign(actor, campaignId);
    const invite = await this.#invites.findById(inviteId);
    if (invite?.campaignId !== campaignId) {
      throw new NotFoundError('CampaignInvite', inviteId);
    }
    const revoked = invite.revoke(this.#clock.now());
    const stored = revoked === invite ? invite : await this.#invites.revoke(revoked);
    return stored.toSummary();
  }

  /**
   * Joins the invite's campaign as a player. A member gets their campaign back whatever the invite's
   * state, so opening a link twice is harmless; anyone else needs an invite that still works.
   */
  public async join(actor: UserId, token: InviteToken): Promise<Campaign> {
    const { invite, campaign } = await this.#invited(token);
    if (mayViewCampaign(actor, campaign)) {
      return campaign;
    }
    const now = this.#clock.now();
    const status = invite.statusAt(now);
    if (status !== InviteStatus.Open) {
      throw new GoneError('CampaignInvite', invite.id, message(CLOSED_MESSAGE[status]));
    }
    const player = campaign
      .withPlayer({ memberId: CampaignMemberId.parse(newId()), userId: actor, now })
      .members.find((member) => member.userId === actor);
    const joined = player === undefined ? undefined : await this.#campaigns.joinByInvite(invite, player, now);
    if (joined === undefined) {
      // The invite stopped working between the check above and the insert: a revoke won the race.
      throw new GoneError('CampaignInvite', invite.id, message(InviteMessage.Revoked));
    }
    return joined;
  }

  /** The invite a token belongs to and its campaign; an unknown token is a 404. */
  async #invited(token: InviteToken): Promise<Invited> {
    const invite = await this.#invites.findByTokenHash(await hashToken(token));
    const campaign = invite === undefined ? undefined : await this.#campaigns.findById(invite.campaignId);
    if (invite === undefined || campaign === undefined) {
      throw new NotFoundError('CampaignInvite', 'token', message(InviteMessage.Unknown));
    }
    return { invite, campaign };
  }

  /**
   * The campaign, when the actor is its GM. Not a member: 404, so its existence doesn't leak
   * (ADR-0007). A player: 403, as they already know it exists.
   */
  async #managedCampaign(actor: UserId, campaignId: CampaignId): Promise<Campaign> {
    const campaign = await this.#campaigns.findById(campaignId);
    if (campaign === undefined || !mayViewCampaign(actor, campaign)) {
      throw new NotFoundError('Campaign', campaignId);
    }
    if (!mayManageInvites(actor, campaign)) {
      throw new ForbiddenError(`Only the GM manages invites to campaign ${campaignId}`);
    }
    return campaign;
  }
}
