import type { AttachedCampaignName, CharacterId } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';

/** The campaign a character is attached to, and the homebrew packs it enables. */
export interface AttachedCampaign {
  readonly name: AttachedCampaignName;
  readonly packs: readonly ContentPackId[];
}

/**
 * Port to the campaign a character is attached to. A character in a campaign uses the campaign's packs and ignores its
 * own (play-and-campaigns.md). The campaign context owns that, and the character context may not import it, so the
 * adapter lives in the composition root. `InMemoryAttachedCampaignPacks` is for tests.
 */
export abstract class AttachedCampaignPacks {
  /** The campaign the character is attached to; none when it is in no campaign. */
  public abstract of(characterId: CharacterId): Promise<AttachedCampaign | undefined>;
}
