import { FIRST_VERSION, InstantCodec, UserId, Version } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignId, CampaignMemberId, CampaignName, CampaignRole } from './campaign-fields';

/** JSON shape of one membership on the wire. */
export const CampaignMemberWire = z.object({
  id: CampaignMemberId,
  userId: UserId,
  role: z.enum(CampaignRole),
  joinedAt: InstantCodec,
});
export type CampaignMember = z.output<typeof CampaignMemberWire>;

/** JSON shape of a campaign on the wire and in storage. */
export const CampaignWire = z
  .object({
    id: CampaignId,
    version: Version,
    name: CampaignName,
    /** The member whose role is `gm`. */
    gmId: UserId,
    /** Oldest membership first. */
    members: z.array(CampaignMemberWire).readonly(),
    createdAt: InstantCodec,
  })
  .refine(
    // Each user once, and exactly one GM member who is `gmId` (as the database enforces): otherwise
    // `roleOf` could refuse the GM their own campaign.
    ({ gmId, members }) => {
      const gms = members.filter((member) => member.role === CampaignRole.Gm);
      const unique = new Set(members.map((member) => member.userId)).size === members.length;
      return unique && gms.length === 1 && gms[0]?.userId === gmId;
    },
    { path: ['members'] },
  );

interface CampaignProps {
  readonly id: CampaignId;
  readonly version: Version;
  readonly name: CampaignName;
  readonly gmId: UserId;
  readonly members: readonly CampaignMember[];
  readonly createdAt: Temporal.Instant;
}

/**
 * Campaign aggregate root: a party of members, one of them its GM. Immutable, like `Character`.
 *
 * Serialization: `Campaign.codec` decodes wire JSON into a `Campaign` and encodes it back.
 */
export class Campaign {
  public static readonly codec = z.codec(CampaignWire, z.instanceof(Campaign), {
    decode: (wire) => new Campaign(wire),
    encode: (campaign) => campaign.toProps(),
  });

  public readonly id: CampaignId;
  public readonly version: Version;
  public readonly name: CampaignName;
  public readonly gmId: UserId;
  public readonly members: readonly CampaignMember[];
  public readonly createdAt: Temporal.Instant;

  public constructor(props: CampaignProps) {
    this.id = props.id;
    this.version = props.version;
    this.name = props.name;
    this.gmId = props.gmId;
    this.members = props.members;
    this.createdAt = props.createdAt;
  }

  /** A new campaign whose only member is its GM, the user who created it. */
  public static create(input: {
    readonly id: CampaignId;
    readonly gmMemberId: CampaignMemberId;
    readonly gmId: UserId;
    readonly name: CampaignName;
    readonly now: Temporal.Instant;
  }): Campaign {
    return new Campaign({
      id: input.id,
      version: FIRST_VERSION,
      name: input.name,
      gmId: input.gmId,
      members: [{ id: input.gmMemberId, userId: input.gmId, role: CampaignRole.Gm, joinedAt: input.now }],
      createdAt: input.now,
    });
  }

  /** The user's role here, or `undefined` when they are not a member. */
  public roleOf(user: UserId): CampaignRole | undefined {
    return this.members.find((member) => member.userId === user)?.role;
  }

  /** This campaign with `userId` joined as a player at `now`; unchanged when they are already a member. */
  public withPlayer(input: {
    readonly memberId: CampaignMemberId;
    readonly userId: UserId;
    readonly now: Temporal.Instant;
  }): Campaign {
    if (this.roleOf(input.userId) !== undefined) {
      return this;
    }
    const player: CampaignMember = {
      id: input.memberId,
      userId: input.userId,
      role: CampaignRole.Player,
      joinedAt: input.now,
    };
    return new Campaign({ ...this.toProps(), members: [...this.members, player] });
  }

  private toProps(): CampaignProps {
    return {
      id: this.id,
      version: this.version,
      name: this.name,
      gmId: this.gmId,
      members: this.members,
      createdAt: this.createdAt,
    };
  }
}
