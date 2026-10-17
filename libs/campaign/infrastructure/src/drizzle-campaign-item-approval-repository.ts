import { CampaignItemApprovalRepository } from '@pioneer/campaign/application';
import type { ItemRevocation } from '@pioneer/campaign/application';
import { ReviewedRuneId } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignItemApproval } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignItemApprovals } from './campaign.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const APPROVE_COMMAND = 'approve-campaign-item';
const REVOKE_COMMAND = 'revoke-campaign-item-approval';

/** Stored for every rule but a rune not allowed, so the live-row unique index needs no nullable column. */
const NO_RUNE = ReviewedRuneId.parse('00000000-0000-0000-0000-000000000000');

type CampaignItemApprovalRow = typeof campaignItemApprovals.$inferSelect;

function toApproval(row: CampaignItemApprovalRow): CampaignItemApproval {
  return {
    id: row.id,
    character: row.characterId,
    item: row.itemId,
    rule: row.rule,
    rune: row.rune === NO_RUNE ? undefined : row.rune,
    value: row.value,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: Temporal.Instant.from(row.approvedAt),
  };
}

export class DrizzleCampaignItemApprovalRepository extends CampaignItemApprovalRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignItemApproval[]> {
    const rows = await this.#db
      .select()
      .from(campaignItemApprovals)
      .where(and(eq(campaignItemApprovals.campaignId, campaignId), isNull(campaignItemApprovals.archivedAt)))
      .orderBy(asc(campaignItemApprovals.approvedAt), asc(campaignItemApprovals.id));
    return rows.map((row) => toApproval(row));
  }

  public override async approve(actor: UserId, campaignId: CampaignId, approval: CampaignItemApproval): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: APPROVE_COMMAND });
      await tx
        .insert(campaignItemApprovals)
        .values({
          id: approval.id,
          campaignId,
          characterId: approval.character,
          itemId: approval.item,
          rule: approval.rule,
          rune: approval.rune ?? NO_RUNE,
          value: approval.value,
          approvedBy: approval.approvedBy,
          approvedAt: approval.approvedAt.toString(),
        })
        .onConflictDoUpdate({
          target: [
            campaignItemApprovals.campaignId,
            campaignItemApprovals.characterId,
            campaignItemApprovals.itemId,
            campaignItemApprovals.rule,
            campaignItemApprovals.rune,
          ],
          targetWhere: isNull(campaignItemApprovals.archivedAt),
          set: {
            value: approval.value,
            approvedBy: approval.approvedBy,
            approvedAt: approval.approvedAt.toString(),
          },
        });
    });
  }

  public override async revoke(actor: UserId, campaignId: CampaignId, { id, at }: ItemRevocation): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: REVOKE_COMMAND });
      await tx
        .update(campaignItemApprovals)
        .set({ archivedAt: at.toString() })
        .where(
          and(
            eq(campaignItemApprovals.id, id),
            eq(campaignItemApprovals.campaignId, campaignId),
            isNull(campaignItemApprovals.archivedAt),
          ),
        );
    });
  }
}
