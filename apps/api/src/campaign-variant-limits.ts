import { CampaignVariantLimits } from '@pioneer/campaign/application';
import { RuleLimitValue } from '@pioneer/campaign/domain';
import type { CampaignId, RuleLimitOverrides } from '@pioneer/campaign/domain';
import { campaignPacks, DrizzleCampaignVariantRepository } from '@pioneer/campaign/infrastructure';
import { variantLimitsInForce, VariantRuleId } from '@pioneer/rules/sdk';
import type { ContentSource } from '@pioneer/rules/sdk';
import { eq } from 'drizzle-orm';

import type { Database } from './database';

/**
 * The campaign context's `CampaignVariantLimits` over the rules context's content: the limits changed by the variant
 * rules the campaign has on, where a pack it no longer enables defines none. It lives in the composition root because
 * neither context may import the other.
 */
export class CampaignVariantLimitsOfContent extends CampaignVariantLimits {
  readonly #db: Database;
  readonly #content: ContentSource;
  readonly #variants: DrizzleCampaignVariantRepository;

  public constructor(db: Database, content: ContentSource) {
    super();
    this.#db = db;
    this.#content = content;
    this.#variants = new DrizzleCampaignVariantRepository(db);
  }

  public override async of(campaignId: CampaignId): Promise<RuleLimitOverrides> {
    const [packs, variants] = await Promise.all([
      this.#db
        .select({ packId: campaignPacks.packId })
        .from(campaignPacks)
        .where(eq(campaignPacks.campaignId, campaignId)),
      this.#variants.listForCampaign(campaignId),
    ]);
    const registry = await this.#content.registry(packs.map((row) => row.packId));
    const limits = variantLimitsInForce(
      registry,
      variants.map((row) => VariantRuleId.parse(row.variantId)),
    );
    return Object.fromEntries(Object.entries(limits).map(([limit, value]) => [limit, RuleLimitValue.parse(value)]));
  }
}
