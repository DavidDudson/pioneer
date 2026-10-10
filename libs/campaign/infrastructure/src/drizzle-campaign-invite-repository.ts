import { CampaignInviteRepository } from '@pioneer/campaign/application';
import { CampaignInvite } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignInviteId, InviteTokenHash } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignInvites } from './campaign.table';

type InviteRow = typeof campaignInvites.$inferSelect;
type NewInviteRow = typeof campaignInvites.$inferInsert;

function optionalInstant(value: string | undefined): Temporal.Instant | undefined {
  return value === undefined ? undefined : Temporal.Instant.from(value);
}

function toInvite(row: InviteRow): CampaignInvite {
  return new CampaignInvite({
    id: row.id,
    campaignId: row.campaignId,
    tokenHash: row.tokenHash,
    createdBy: row.createdBy,
    createdAt: Temporal.Instant.from(row.createdAt),
    expiresAt: Temporal.Instant.from(row.expiresAt),
    revokedAt: optionalInstant(row.revokedAt ?? undefined),
  });
}

/** A new invite's row; a new invite is never revoked, so `revoked_at` keeps its default. */
function toRow(invite: CampaignInvite): NewInviteRow {
  return {
    id: invite.id,
    campaignId: invite.campaignId,
    tokenHash: invite.tokenHash,
    createdBy: invite.createdBy,
    createdAt: invite.createdAt.toString(),
    expiresAt: invite.expiresAt.toString(),
  };
}

export class DrizzleCampaignInviteRepository extends CampaignInviteRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async insert(invite: CampaignInvite): Promise<CampaignInvite> {
    const [row] = await this.#db.insert(campaignInvites).values(toRow(invite)).returning();
    if (row === undefined) {
      throw new Error(`Insert of invite ${invite.id} returned no row`);
    }
    return toInvite(row);
  }

  public override async findByTokenHash(tokenHash: InviteTokenHash): Promise<CampaignInvite | undefined> {
    const [row] = await this.#db
      .select()
      .from(campaignInvites)
      .where(eq(campaignInvites.tokenHash, tokenHash))
      .limit(1);
    return row === undefined ? undefined : toInvite(row);
  }

  public override async findById(id: CampaignInviteId): Promise<CampaignInvite | undefined> {
    const [row] = await this.#db.select().from(campaignInvites).where(eq(campaignInvites.id, id)).limit(1);
    return row === undefined ? undefined : toInvite(row);
  }

  public override async listOpen(campaignId: CampaignId, now: Temporal.Instant): Promise<readonly CampaignInvite[]> {
    const open = and(
      eq(campaignInvites.campaignId, campaignId),
      isNull(campaignInvites.revokedAt),
      gt(campaignInvites.expiresAt, now.toString()),
    );
    const rows = await this.#db
      .select()
      .from(campaignInvites)
      .where(open)
      .orderBy(desc(campaignInvites.createdAt), desc(campaignInvites.id));
    return rows.map((row) => toInvite(row));
  }

  public override async revoke(invite: CampaignInvite): Promise<CampaignInvite> {
    if (invite.revokedAt === undefined) {
      throw new Error(`Invite ${invite.id} is not revoked`);
    }
    // Only a first revocation is written, so racing revokes keep the earliest time.
    const [row] = await this.#db
      .update(campaignInvites)
      .set({ revokedAt: invite.revokedAt.toString() })
      .where(and(eq(campaignInvites.id, invite.id), isNull(campaignInvites.revokedAt)))
      .returning();
    if (row !== undefined) {
      return toInvite(row);
    }
    const current = await this.findById(invite.id);
    if (current === undefined) {
      throw new Error(`Invite ${invite.id} vanished while being revoked`);
    }
    return current;
  }

  public override async revokeOpen(campaignId: CampaignId, now: Temporal.Instant): Promise<void> {
    const open = and(
      eq(campaignInvites.campaignId, campaignId),
      isNull(campaignInvites.revokedAt),
      gt(campaignInvites.expiresAt, now.toString()),
    );
    await this.#db.update(campaignInvites).set({ revokedAt: now.toString() }).where(open);
  }
}
