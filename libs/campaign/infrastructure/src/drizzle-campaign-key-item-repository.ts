import { CampaignKeyItemRepository } from '@pioneer/campaign/application';
import type { KeyItemArchival, KeyItemHolder } from '@pioneer/campaign/application';
import { KeyItemRunes } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignKeyItem } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignKeyItems } from './campaign.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const CREATE_COMMAND = 'create-campaign-key-item';
const HOLDER_COMMAND = 'set-campaign-key-item-holder';
const ARCHIVE_COMMAND = 'archive-campaign-key-item';

type CampaignKeyItemRow = typeof campaignKeyItems.$inferSelect;

function toKeyItem(row: CampaignKeyItemRow): CampaignKeyItem {
  return {
    id: row.id,
    name: row.name,
    base: { item: row.baseItemId, name: row.baseItemName },
    runes: KeyItemRunes.parse(row.runes),
    notes: row.notes,
    holder: row.holderId ?? undefined,
    createdAt: Temporal.Instant.from(row.createdAt),
  };
}

export class DrizzleCampaignKeyItemRepository extends CampaignKeyItemRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignKeyItem[]> {
    const rows = await this.#db
      .select()
      .from(campaignKeyItems)
      .where(and(eq(campaignKeyItems.campaignId, campaignId), isNull(campaignKeyItems.archivedAt)))
      .orderBy(asc(campaignKeyItems.createdAt), asc(campaignKeyItems.id));
    return rows.map((row) => toKeyItem(row));
  }

  public override async insert(actor: UserId, campaignId: CampaignId, keyItem: CampaignKeyItem): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: CREATE_COMMAND });
      await tx.insert(campaignKeyItems).values({
        id: keyItem.id,
        campaignId,
        name: keyItem.name,
        baseItemId: keyItem.base.item,
        baseItemName: keyItem.base.name,
        runes: keyItem.runes,
        notes: keyItem.notes,
        holderId: keyItem.holder,
        createdAt: keyItem.createdAt.toString(),
      });
    });
  }

  public override async setHolder(actor: UserId, campaignId: CampaignId, { id, holder }: KeyItemHolder): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: HOLDER_COMMAND });
      await tx
        .update(campaignKeyItems)
        .set({ holderId: holder ?? sql`null` })
        .where(
          and(
            eq(campaignKeyItems.id, id),
            eq(campaignKeyItems.campaignId, campaignId),
            isNull(campaignKeyItems.archivedAt),
          ),
        );
    });
  }

  public override async archive(actor: UserId, campaignId: CampaignId, { id, at }: KeyItemArchival): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ARCHIVE_COMMAND });
      await tx
        .update(campaignKeyItems)
        .set({ archivedAt: at.toString() })
        .where(
          and(
            eq(campaignKeyItems.id, id),
            eq(campaignKeyItems.campaignId, campaignId),
            isNull(campaignKeyItems.archivedAt),
          ),
        );
    });
  }
}
