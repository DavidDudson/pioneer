import type { EnablingCampaignName, HomebrewPack } from '@pioneer/homebrew/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port to the campaign context for where a pack is enabled. Campaigns own enablement, so the adapter lives in the
 * composition root; `InMemoryPackEnablementDirectory` is for tests.
 */
export abstract class PackEnablementDirectory {
  /** The names of the campaigns that enable the pack, alphabetically. */
  public abstract campaignsEnabling(pack: HomebrewPack): Promise<readonly EnablingCampaignName[]>;

  /** Whether the user belongs to at least one campaign that enables the pack. */
  public abstract belongsToCampaignEnabling(user: UserId, pack: HomebrewPack): Promise<boolean>;
}
