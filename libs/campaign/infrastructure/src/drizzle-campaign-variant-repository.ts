import { CampaignVariantRepository } from '@pioneer/campaign/application';
import type { CampaignId, CampaignVariantRule, EnabledVariantRuleId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignVariantRules } from './campaign.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const ENABLE_COMMAND = 'enable-campaign-variant-rule';
const DISABLE_COMMAND = 'disable-campaign-variant-rule';

type CampaignVariantRuleRow = typeof campaignVariantRules.$inferSelect;

function toCampaignVariantRule(row: CampaignVariantRuleRow): CampaignVariantRule {
  return {
    id: row.id,
    variantId: row.variantId,
    enabledBy: row.enabledBy ?? undefined,
    enabledAt: Temporal.Instant.from(row.enabledAt),
  };
}

export class DrizzleCampaignVariantRepository extends CampaignVariantRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignVariantRule[]> {
    const rows = await this.#db
      .select()
      .from(campaignVariantRules)
      .where(eq(campaignVariantRules.campaignId, campaignId));
    // Sorted here so no query needs an index for it; a campaign enables few variant rules.
    return rows
      .map((row) => toCampaignVariantRule(row))
      .toSorted(
        (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
      );
  }

  public override async enable(actor: UserId, campaignId: CampaignId, rule: CampaignVariantRule): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ENABLE_COMMAND });
      await tx
        .insert(campaignVariantRules)
        .values({
          id: rule.id,
          campaignId,
          variantId: rule.variantId,
          enabledBy: rule.enabledBy,
          enabledAt: rule.enabledAt.toString(),
        })
        .onConflictDoNothing({ target: [campaignVariantRules.campaignId, campaignVariantRules.variantId] });
    });
  }

  public override async disable(actor: UserId, campaignId: CampaignId, variantId: EnabledVariantRuleId): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: DISABLE_COMMAND });
      await tx
        .delete(campaignVariantRules)
        .where(and(eq(campaignVariantRules.campaignId, campaignId), eq(campaignVariantRules.variantId, variantId)));
    });
  }
}
