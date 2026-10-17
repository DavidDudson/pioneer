import { CampaignRuleLimitRepository } from '@pioneer/campaign/application';
import type { CampaignId, CampaignRuleLimit, RuleLimitKey } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignRuleLimits } from './campaign.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const SET_COMMAND = 'set-campaign-rule-limit';
const RESET_COMMAND = 'reset-campaign-rule-limit';

type CampaignRuleLimitRow = typeof campaignRuleLimits.$inferSelect;

function toCampaignRuleLimit(row: CampaignRuleLimitRow): CampaignRuleLimit {
  return {
    id: row.id,
    limit: row.limit,
    value: row.value,
    setBy: row.setBy ?? undefined,
    setAt: Temporal.Instant.from(row.setAt),
  };
}

export class DrizzleCampaignRuleLimitRepository extends CampaignRuleLimitRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignRuleLimit[]> {
    const rows = await this.#db.select().from(campaignRuleLimits).where(eq(campaignRuleLimits.campaignId, campaignId));
    return rows.map((row) => toCampaignRuleLimit(row));
  }

  public override async set(actor: UserId, campaignId: CampaignId, limit: CampaignRuleLimit): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: SET_COMMAND });
      await tx
        .insert(campaignRuleLimits)
        .values({
          id: limit.id,
          campaignId,
          limit: limit.limit,
          value: limit.value,
          setBy: limit.setBy,
          setAt: limit.setAt.toString(),
        })
        .onConflictDoUpdate({
          target: [campaignRuleLimits.campaignId, campaignRuleLimits.limit],
          set: { value: limit.value, setBy: limit.setBy, setAt: limit.setAt.toString() },
        });
    });
  }

  public override async reset(actor: UserId, campaignId: CampaignId, limit: RuleLimitKey): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: RESET_COMMAND });
      await tx
        .delete(campaignRuleLimits)
        .where(and(eq(campaignRuleLimits.campaignId, campaignId), eq(campaignRuleLimits.limit, limit)));
    });
  }
}
