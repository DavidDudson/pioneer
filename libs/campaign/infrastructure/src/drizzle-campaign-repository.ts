import { CampaignRepository } from '@pioneer/campaign/application';
import type { CampaignAudit } from '@pioneer/campaign/application';
import { Campaign, CampaignRole } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignInvite, CampaignMember } from '@pioneer/campaign/domain';
import { Temporal, VersionConflictError } from '@pioneer/shared/kernel';
import type { UserId, Version } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, eq, gt, inArray, isNotNull, isNull, ne, notInArray, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignInvites, campaignMembers, campaigns } from './campaign.table';

type CampaignRow = typeof campaigns.$inferSelect;
/** What an insert writes: never `archivedAt`, which only archive and restore touch. */
type SavedRow = Omit<CampaignRow, 'archivedAt'>;
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

function toRow(campaign: Campaign): SavedRow {
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
    return this.#listFor(and(eq(campaignMembers.userId, userId), isNull(campaigns.archivedAt)));
  }

  public override async listArchivedForGm(gmId: UserId): Promise<readonly Campaign[]> {
    return this.#listFor(
      and(eq(campaignMembers.userId, gmId), eq(campaigns.gmId, gmId), isNotNull(campaigns.archivedAt)),
    );
  }

  async #listFor(where: SQL | undefined): Promise<readonly Campaign[]> {
    const rows = await this.#db
      .select({ campaign: campaigns })
      .from(campaignMembers)
      .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
      .where(where)
      .orderBy(asc(campaignMembers.joinedAt), asc(campaignMembers.campaignId));
    const members = await this.#membersOf(rows.map(({ campaign }) => campaign.id));
    return rows.map(({ campaign }) => toCampaign(campaign, members.get(campaign.id) ?? []));
  }

  public override async findById(id: CampaignId): Promise<Campaign | undefined> {
    return this.#findOne(and(eq(campaigns.id, id), isNull(campaigns.archivedAt)));
  }

  public override async findArchivedById(id: CampaignId): Promise<Campaign | undefined> {
    return this.#findOne(and(eq(campaigns.id, id), isNotNull(campaigns.archivedAt)));
  }

  async #findOne(where: SQL | undefined): Promise<Campaign | undefined> {
    const [row] = await this.#db.select().from(campaigns).where(where).limit(1);
    if (row === undefined) {
      return undefined;
    }
    const members = await this.#membersOf([row.id]);
    return toCampaign(row, members.get(row.id) ?? []);
  }

  public override async archive(id: CampaignId, now: Temporal.Instant, audit: CampaignAudit): Promise<void> {
    await this.#setArchived(and(eq(campaigns.id, id), isNull(campaigns.archivedAt)), now.toString(), audit);
  }

  public override async restore(id: CampaignId, audit: CampaignAudit): Promise<void> {
    await this.#setArchived(and(eq(campaigns.id, id), isNotNull(campaigns.archivedAt)), sql`null`, audit);
  }

  /** Stamps or clears `archivedAt` on the rows `where` matches, with the audit context. Version stays: nothing about the members changed. */
  async #setArchived(where: SQL | undefined, archivedAt: SQL | string, audit: CampaignAudit): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      await tx.update(campaigns).set({ archivedAt }).where(where);
    });
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

  public override async joinByInvite(
    invite: CampaignInvite,
    member: CampaignMember,
    now: Temporal.Instant,
  ): Promise<Campaign | undefined> {
    const added = await this.#db.transaction(async (tx) => {
      // A share lock waits out a revoke in flight and then sees its result, so the revoke wins.
      const open = and(
        eq(campaignInvites.id, invite.id),
        isNull(campaignInvites.revokedAt),
        gt(campaignInvites.expiresAt, now.toString()),
      );
      const [stillOpen] = await tx.select({ id: campaignInvites.id }).from(campaignInvites).where(open).for('share');
      if (stillOpen === undefined) {
        return false;
      }
      // A campaign archived since the invite was read takes no one, as if the invite were gone.
      const [live] = await tx
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(and(eq(campaigns.id, invite.campaignId), isNull(campaigns.archivedAt)))
        .for('share');
      if (live === undefined) {
        return false;
      }
      const inserted = await tx
        .insert(campaignMembers)
        .values(toMemberRow(invite.campaignId, member))
        .onConflictDoNothing({ target: [campaignMembers.campaignId, campaignMembers.userId] })
        .returning({ id: campaignMembers.id });
      if (inserted.length > 0) {
        await tx
          .update(campaigns)
          .set({ version: sql`${campaigns.version} + 1` })
          .where(eq(campaigns.id, invite.campaignId));
      }
      return true;
    });
    return added ? this.findById(invite.campaignId) : undefined;
  }

  public override async updateMembers(campaign: Campaign, expectedVersion: Version): Promise<Campaign> {
    const gm = campaign.members.find((member) => member.role === CampaignRole.Gm);
    if (gm === undefined) {
      throw new Error(`Campaign ${campaign.id} has no GM`);
    }
    await this.#db.transaction(async (tx) => {
      // The version check takes the campaign row's lock, so membership changes to one campaign run one at a time.
      const [updated] = await tx
        .update(campaigns)
        .set({ version: campaign.version, gmId: campaign.gmId })
        .where(and(eq(campaigns.id, campaign.id), eq(campaigns.version, expectedVersion), isNull(campaigns.archivedAt)))
        .returning({ id: campaigns.id });
      if (updated === undefined) {
        throw new VersionConflictError('Campaign', campaign.id);
      }
      const kept = campaign.members.map((member) => member.id);
      await tx
        .delete(campaignMembers)
        .where(and(eq(campaignMembers.campaignId, campaign.id), notInArray(campaignMembers.id, kept)));
      // Demote first: at most one GM member at a time (campaign_members_one_gm_idx).
      await tx
        .update(campaignMembers)
        .set({ role: CampaignRole.Player })
        .where(
          and(
            eq(campaignMembers.campaignId, campaign.id),
            eq(campaignMembers.role, CampaignRole.Gm),
            ne(campaignMembers.id, gm.id),
          ),
        );
      await tx
        .update(campaignMembers)
        .set({ role: CampaignRole.Gm })
        .where(and(eq(campaignMembers.campaignId, campaign.id), eq(campaignMembers.id, gm.id)));
    });
    const stored = await this.findById(campaign.id);
    if (stored === undefined) {
      throw new Error(`Campaign ${campaign.id} vanished after its members were updated`);
    }
    return stored;
  }

  /** Every member of each campaign, grouped by campaign. */
  async #membersOf(ids: readonly CampaignId[]): Promise<ReadonlyMap<CampaignId, readonly MemberRow[]>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.#db
      .select()
      .from(campaignMembers)
      .where(inArray(campaignMembers.campaignId, [...ids]));
    return Map.groupBy(rows, (row) => row.campaignId);
  }
}
