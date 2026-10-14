import { campaignCharacters, campaignPacks, campaigns, campaignVariantRules } from '@pioneer/campaign/infrastructure';
import { AttachedCampaignPacks } from '@pioneer/character/application';
import type { AttachedCampaign } from '@pioneer/character/application';
import { AttachedCampaignName } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { VariantRuleId } from '@pioneer/rules/sdk';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/**
 * The character context's `AttachedCampaignPacks` over the campaign context's tables. It lives in the composition root
 * because neither context may import the other.
 */
export class CampaignPackDirectory extends AttachedCampaignPacks {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async of(characterId: CharacterId): Promise<AttachedCampaign | undefined> {
    const [attached] = await this.#db
      .select({ id: campaigns.id, name: campaigns.name })
      .from(campaignCharacters)
      .innerJoin(campaigns, eq(campaigns.id, campaignCharacters.campaignId))
      .where(eq(campaignCharacters.characterId, characterId))
      .limit(1);
    if (attached === undefined) {
      return undefined;
    }
    const rows = await this.#db
      .select({ packId: campaignPacks.packId })
      .from(campaignPacks)
      .where(eq(campaignPacks.campaignId, attached.id));
    const variants = await this.#db
      .select({ variantId: campaignVariantRules.variantId })
      .from(campaignVariantRules)
      .where(eq(campaignVariantRules.campaignId, attached.id));
    return {
      name: AttachedCampaignName.parse(attached.name),
      packs: rows.map((row) => row.packId),
      variants: variants.map((row) => VariantRuleId.parse(row.variantId)),
    };
  }
}
