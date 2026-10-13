import { CampaignPackRepository } from '@pioneer/campaign/application';
import type { PackEnablement } from '@pioneer/campaign/application';
import type { CampaignId, CampaignPack, EnabledPackId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, eq, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignPacks } from './campaign.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const ENABLE_COMMAND = 'enable-campaign-pack';
const DISABLE_COMMAND = 'disable-campaign-pack';

type CampaignPackRow = typeof campaignPacks.$inferSelect;

function toCampaignPack(row: CampaignPackRow): CampaignPack {
  return {
    id: row.id,
    packId: row.packId,
    enabledBy: row.enabledBy ?? undefined,
    enabledAt: Temporal.Instant.from(row.enabledAt),
  };
}

export class DrizzleCampaignPackRepository extends CampaignPackRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignPack[]> {
    const rows = await this.#db.select().from(campaignPacks).where(eq(campaignPacks.campaignId, campaignId));
    // Sorted here so no query needs an index for it; a campaign enables few packs.
    return rows
      .map((row) => toCampaignPack(row))
      .toSorted(
        (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
      );
  }

  public override async enable(
    actor: UserId,
    { campaignId, packs }: PackEnablement,
    whileLocked: () => Promise<void>,
  ): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ENABLE_COMMAND });
      // The packs are locked in id order, so two enablements cannot wait on each other.
      // Changing a pack's visibility takes the same lock: it waits for this to commit, then sees the campaign.
      // Written as SQL because the rules context's tables are outside this one's boundary (ADR-0055).
      const ids = packs.map((pack) => pack.packId).toSorted((left, right) => left.localeCompare(right));
      if (ids.length > 0) {
        await tx.execute(
          sql`select id from content_packs where id in (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )}) order by id for update`,
        );
      }
      await whileLocked();
      if (packs.length > 0) {
        await tx
          .insert(campaignPacks)
          .values(
            packs.map((pack) => ({
              id: pack.id,
              campaignId,
              packId: pack.packId,
              enabledBy: pack.enabledBy,
              enabledAt: pack.enabledAt.toString(),
            })),
          )
          .onConflictDoNothing({ target: [campaignPacks.campaignId, campaignPacks.packId] });
      }
    });
  }

  public override async disable(actor: UserId, campaignId: CampaignId, packId: EnabledPackId): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: DISABLE_COMMAND });
      await tx
        .delete(campaignPacks)
        .where(and(eq(campaignPacks.campaignId, campaignId), eq(campaignPacks.packId, packId)));
    });
  }
}
