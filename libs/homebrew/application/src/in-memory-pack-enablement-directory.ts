import { EnablingCampaignName } from '@pioneer/homebrew/domain';
import type { HomebrewPack } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

import { PackEnablementDirectory } from './pack-enablement-directory';

interface Enablement {
  readonly packId: ContentPackId;
  readonly campaign: EnablingCampaignName;
  readonly members: readonly UserId[];
}

/** Directory adapter for tests: enablements given up front. */
export class InMemoryPackEnablementDirectory extends PackEnablementDirectory {
  readonly #enablements: Enablement[] = [];

  /** `campaign` enables the pack; `members` belong to it. */
  public enable(packId: ContentPackId, campaign: string, members: readonly UserId[]): this {
    this.#enablements.push({
      packId,
      campaign: EnablingCampaignName.parse(campaign),
      members,
    });
    return this;
  }

  public override async campaignsEnabling(pack: HomebrewPack): Promise<readonly EnablingCampaignName[]> {
    return this.#enablements
      .filter(({ packId }) => packId === pack.id)
      .map(({ campaign }) => campaign)
      .toSorted((left, right) => left.localeCompare(right));
  }

  public override async belongsToCampaignEnabling(user: UserId, pack: HomebrewPack): Promise<boolean> {
    return this.#enablements.some(({ packId, members }) => packId === pack.id && members.includes(user));
  }
}
