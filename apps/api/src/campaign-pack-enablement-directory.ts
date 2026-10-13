import { campaignMembers, campaignPacks, campaigns } from '@pioneer/campaign/infrastructure';
import { PackEnablementDirectory } from '@pioneer/homebrew/application';
import type { ReadablePack } from '@pioneer/homebrew/application';
import { EnablingCampaignName } from '@pioneer/homebrew/domain';
import type { UserId } from '@pioneer/shared/kernel';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/**
 * Homebrew's `PackEnablementDirectory` over the campaign context's tables. It lives in the composition root
 * because neither context may import the other.
 */
export class CampaignPackEnablementDirectory extends PackEnablementDirectory {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async campaignsEnabling(pack: ReadablePack): Promise<readonly EnablingCampaignName[]> {
    const rows = await this.#db
      .select({ name: campaigns.name })
      .from(campaignPacks)
      .innerJoin(campaigns, eq(campaigns.id, campaignPacks.campaignId))
      .where(eq(campaignPacks.packId, pack.id));
    // Sorted here so no query needs an index for it; a pack is enabled in few campaigns.
    return rows.map((row) => EnablingCampaignName.parse(row.name)).toSorted((left, right) => left.localeCompare(right));
  }

  public override async belongsToCampaignEnabling(user: UserId, pack: ReadablePack): Promise<boolean> {
    const [row] = await this.#db
      .select({ campaignId: campaignPacks.campaignId })
      .from(campaignPacks)
      .innerJoin(
        campaignMembers,
        and(eq(campaignMembers.campaignId, campaignPacks.campaignId), eq(campaignMembers.userId, user)),
      )
      .where(eq(campaignPacks.packId, pack.id))
      .limit(1);
    return row !== undefined;
  }
}
