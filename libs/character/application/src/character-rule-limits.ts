import { withOverrides } from '@pioneer/character/domain';
import type { Character, RuleLimits } from '@pioneer/character/domain';

import type { AttachedCampaignPacks } from './attached-campaign-packs';
import { EffectiveRuleLimits } from './effective-rule-limits';

/**
 * The limits a character is held to: its campaign's number for each limit the GM set, the core rules' for the rest. A
 * character outside a campaign gets the core rules' until it can set its own. No access check; the caller has one.
 */
export class CharacterRuleLimits extends EffectiveRuleLimits {
  readonly #campaigns: AttachedCampaignPacks;

  public constructor(campaigns: AttachedCampaignPacks) {
    super();
    this.#campaigns = campaigns;
  }

  public override async of(character: Character): Promise<RuleLimits> {
    const attached = await this.#campaigns.of(character.id);
    return withOverrides(attached?.limits);
  }
}
