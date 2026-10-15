import { VariantRuleCatalog } from '@pioneer/campaign/application';
import { EnabledVariantRuleId, PackTitle, VariantRuleName } from '@pioneer/campaign/domain';
import type { CampaignId, VariantRuleOption } from '@pioneer/campaign/domain';
import { campaignPacks } from '@pioneer/campaign/infrastructure';
import type { ContentSource } from '@pioneer/rules/sdk';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/**
 * The campaign context's `VariantRuleCatalog` over the rules context's content: the variant rules defined by the
 * official packs and by the homebrew packs the campaign enables. It lives in the composition root because neither
 * context may import the other.
 */
export class CampaignVariantRuleCatalog extends VariantRuleCatalog {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;
  readonly #content: ContentSource;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>, content: ContentSource) {
    super();
    this.#db = db;
    this.#content = content;
  }

  public override async of(campaignId: CampaignId): Promise<readonly VariantRuleOption[]> {
    const rows = await this.#db
      .select({ packId: campaignPacks.packId })
      .from(campaignPacks)
      .where(eq(campaignPacks.campaignId, campaignId));
    const registry = await this.#content.registry(rows.map((row) => row.packId));
    return registry.variantRules().map(({ id, definition, pack }) => ({
      variantId: EnabledVariantRuleId.parse(id),
      name: VariantRuleName.parse(definition.name),
      packTitle: PackTitle.parse(pack.manifest.title),
    }));
  }
}
