import { CampaignRepository } from '@pioneer/campaign/application';
import { Campaign } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignMember } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { asc, eq, inArray } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignMembers, campaigns } from './campaign.table';

type CampaignRow = typeof campaigns.$inferSelect;
type MemberRow = typeof campaignMembers.$inferSelect;

function toMember(row: MemberRow): CampaignMember {
  return { id: row.id, userId: row.userId, role: row.role, joinedAt: Temporal.Instant.from(row.joinedAt) };
}

/** Oldest membership first, user id breaking ties; sorted here so no query needs an index for it. */
function byJoined(left: CampaignMember, right: CampaignMember): number {
  return Temporal.Instant.compare(left.joinedAt, right.joinedAt) || left.userId.localeCompare(right.userId);
}

function toCampaign(row: CampaignRow, members: readonly MemberRow[]): Campaign {
  return new Campaign({
    id: row.id,
    version: row.version,
    name: row.name,
    gmId: row.gmId,
    members: members.map((member) => toMember(member)).toSorted(byJoined),
    createdAt: Temporal.Instant.from(row.createdAt),
  });
}

function toRow(campaign: Campaign): CampaignRow {
  return {
    id: campaign.id,
    version: campaign.version,
    name: campaign.name,
    gmId: campaign.gmId,
    createdAt: campaign.createdAt.toString(),
  };
}

function toMemberRow(campaignId: CampaignId, member: CampaignMember): MemberRow {
  return {
    id: member.id,
    campaignId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt.toString(),
  };
}

export class DrizzleCampaignRepository extends CampaignRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForMember(userId: UserId): Promise<readonly Campaign[]> {
    const rows = await this.#db
      .select({ campaign: campaigns })
      .from(campaignMembers)
      .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
      .where(eq(campaignMembers.userId, userId))
      .orderBy(asc(campaignMembers.joinedAt), asc(campaignMembers.campaignId));
    const members = await this.#membersOf(rows.map(({ campaign }) => campaign.id));
    return rows.map(({ campaign }) => toCampaign(campaign, members.get(campaign.id) ?? []));
  }

  public override async findById(id: CampaignId): Promise<Campaign | undefined> {
    const [row] = await this.#db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (row === undefined) {
      return undefined;
    }
    const members = await this.#membersOf([id]);
    return toCampaign(row, members.get(id) ?? []);
  }

  public override async insert(campaign: Campaign): Promise<Campaign> {
    return this.#db.transaction(async (tx) => {
      const [row] = await tx.insert(campaigns).values(toRow(campaign)).returning();
      if (row === undefined) {
        throw new Error(`Insert of campaign ${campaign.id} returned no row`);
      }
      const members = await tx
        .insert(campaignMembers)
        .values(campaign.members.map((member) => toMemberRow(campaign.id, member)))
        .returning();
      return toCampaign(row, members);
    });
  }

  /** Every member of each campaign, grouped by campaign. */
  async #membersOf(ids: readonly CampaignId[]): Promise<ReadonlyMap<CampaignId, readonly MemberRow[]>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.#db.select().from(campaignMembers).where(inArray(campaignMembers.campaignId, [...ids]));
    return Map.groupBy(rows, (row) => row.campaignId);
  }
}
