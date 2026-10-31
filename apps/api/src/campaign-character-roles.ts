import { CampaignRole } from '@pioneer/campaign/domain';
import { campaignCharacters, campaignMembers, campaigns } from '@pioneer/campaign/infrastructure';
import { CharacterCampaignRoles } from '@pioneer/character/application';
import { OverrideRole } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';
import { and, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/**
 * The character context's `CharacterCampaignRoles` over the campaign context's tables. It lives in the composition
 * root because neither context may import the other. An archived campaign has no GM to act: it reads as no campaign.
 */
export class CampaignCharacterRoles extends CharacterCampaignRoles {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async roleOf(characterId: CharacterId, user: UserId): Promise<OverrideRole | undefined> {
    const [member] = await this.#db
      .select({ role: campaignMembers.role })
      .from(campaignCharacters)
      .innerJoin(campaigns, eq(campaigns.id, campaignCharacters.campaignId))
      .innerJoin(campaignMembers, and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, user)))
      .where(and(eq(campaignCharacters.characterId, characterId), isNull(campaigns.archivedAt)))
      .limit(1);
    if (member === undefined) {
      return undefined;
    }
    return member.role === CampaignRole.Gm ? OverrideRole.Gm : OverrideRole.Player;
  }
}
