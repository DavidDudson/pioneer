import {
  campaignCharacters,
  campaignPacks,
  campaignRuleLimits,
  campaigns,
  campaignVariantRules,
} from '@pioneer/campaign/infrastructure';
import { AttachedCampaignPacks } from '@pioneer/character/application';
import type { AttachedCampaign } from '@pioneer/character/application';
import { AttachedCampaignName, CampaignAlly, RuleLimitOverridesSchema } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { characters } from '@pioneer/character/infrastructure';
import { VariantRuleId } from '@pioneer/rules/sdk';
import { and, eq, isNull, ne } from 'drizzle-orm';
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
      .where(and(eq(campaignCharacters.characterId, characterId), isNull(campaigns.archivedAt)))
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
    const limits = await this.#db
      .select({ limit: campaignRuleLimits.limit, value: campaignRuleLimits.value })
      .from(campaignRuleLimits)
      .where(eq(campaignRuleLimits.campaignId, attached.id));
    return {
      name: AttachedCampaignName.parse(attached.name),
      packs: rows.map((row) => row.packId),
      variants: variants.map((row) => VariantRuleId.parse(row.variantId)),
      limits: RuleLimitOverridesSchema.parse(Object.fromEntries(limits.map((row) => [row.limit, row.value]))),
    };
  }

  public override async alliesOf(characterId: CharacterId): Promise<readonly CampaignAlly[]> {
    const [attached] = await this.#db
      .select({ campaignId: campaignCharacters.campaignId })
      .from(campaignCharacters)
      .where(eq(campaignCharacters.characterId, characterId))
      .limit(1);
    if (attached === undefined) {
      return [];
    }
    const rows = await this.#db
      .select({ characterId: characters.id, name: characters.name })
      .from(campaignCharacters)
      .innerJoin(characters, eq(characters.id, campaignCharacters.characterId))
      .where(
        and(eq(campaignCharacters.campaignId, attached.campaignId), ne(campaignCharacters.characterId, characterId)),
      );
    return rows.map((row) => CampaignAlly.parse(row));
  }
}
