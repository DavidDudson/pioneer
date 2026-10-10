import { InstantCodec, Temporal } from '@pioneer/shared/kernel';
import type { UserId, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignInviteId } from './campaign-fields';
import type { CampaignId, InviteTokenHash } from './campaign-fields';

const INVITE_DAYS = 7;
const HOURS_PER_DAY = 24;

/** How long an invite link works: 7 days, in hours because instants have no calendar. */
export const INVITE_LIFETIME: Temporal.Duration = Temporal.Duration.from({ hours: INVITE_DAYS * HOURS_PER_DAY });

/** Whether an invite still lets someone join. */
export const InviteStatus = { Open: 'open', Expired: 'expired', Revoked: 'revoked' } as const;
export type InviteStatus = ValueOf<typeof InviteStatus>;

/** JSON shape of an invite in the GM's list. The token hash never leaves the server. */
export const InviteSummary = z.object({
  id: CampaignInviteId,
  createdAt: InstantCodec,
  expiresAt: InstantCodec,
  revokedAt: InstantCodec.optional(),
});
export type InviteSummary = z.output<typeof InviteSummary>;

interface CampaignInviteProps {
  readonly id: CampaignInviteId;
  readonly campaignId: CampaignId;
  readonly tokenHash: InviteTokenHash;
  readonly createdBy: UserId;
  readonly createdAt: Temporal.Instant;
  readonly expiresAt: Temporal.Instant;
  readonly revokedAt: Temporal.Instant | undefined;
}

/**
 * A link the GM hands out; whoever opens it signed in joins the campaign as a player. Only the
 * token's hash is kept, so a link can be shown once and never again. Immutable.
 */
export class CampaignInvite {
  public readonly id: CampaignInviteId;
  public readonly campaignId: CampaignId;
  public readonly tokenHash: InviteTokenHash;
  public readonly createdBy: UserId;
  public readonly createdAt: Temporal.Instant;
  public readonly expiresAt: Temporal.Instant;
  public readonly revokedAt: Temporal.Instant | undefined;

  public constructor(props: CampaignInviteProps) {
    this.id = props.id;
    this.campaignId = props.campaignId;
    this.tokenHash = props.tokenHash;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
  }

  /** A new invite that works for `INVITE_LIFETIME` from `now`. */
  public static issue(input: {
    readonly id: CampaignInviteId;
    readonly campaignId: CampaignId;
    readonly tokenHash: InviteTokenHash;
    readonly createdBy: UserId;
    readonly now: Temporal.Instant;
  }): CampaignInvite {
    return new CampaignInvite({
      id: input.id,
      campaignId: input.campaignId,
      tokenHash: input.tokenHash,
      createdBy: input.createdBy,
      createdAt: input.now,
      expiresAt: input.now.add(INVITE_LIFETIME),
      revokedAt: undefined,
    });
  }

  /** Revoked wins over expired: the GM's choice is the more useful thing to say. */
  public statusAt(now: Temporal.Instant): InviteStatus {
    if (this.revokedAt !== undefined) {
      return InviteStatus.Revoked;
    }
    return Temporal.Instant.compare(now, this.expiresAt) < 0 ? InviteStatus.Open : InviteStatus.Expired;
  }

  /** This invite revoked at `now`; one already revoked keeps its first revocation time. */
  public revoke(now: Temporal.Instant): CampaignInvite {
    return this.revokedAt === undefined ? new CampaignInvite({ ...this.#props(), revokedAt: now }) : this;
  }

  public toSummary(): InviteSummary {
    return {
      id: this.id,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      ...(this.revokedAt === undefined ? {} : { revokedAt: this.revokedAt }),
    };
  }

  #props(): CampaignInviteProps {
    return {
      id: this.id,
      campaignId: this.campaignId,
      tokenHash: this.tokenHash,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      revokedAt: this.revokedAt,
    };
  }
}
