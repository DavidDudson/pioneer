import type {
  AttachedCampaignId,
  AttachedCampaignName,
  CampaignAlly,
  CharacterId,
  ItemApproval,
  RuleLimitOverrides,
} from '@pioneer/character/domain';
import type { ContentPackId, VariantRuleId } from '@pioneer/rules/sdk';

/** The campaign a character is attached to, the homebrew packs it enables and the variant rules its GM turned on. */
export interface AttachedCampaign {
  /** Its id, which the sheet links its key items to; left out where nothing links. */
  readonly id?: AttachedCampaignId | undefined;
  readonly name: AttachedCampaignName;
  readonly packs: readonly ContentPackId[];
  readonly variants: readonly VariantRuleId[];
  /** The limits its GM changed; a limit left out is the core rules'. */
  readonly limits?: RuleLimitOverrides | undefined;
  /** The rule-breaking lines its GM approved for this character, which silence their warnings (ADR-0064). */
  readonly approvals?: readonly ItemApproval[] | undefined;
}

/**
 * Port to the campaign a character is attached to. A character in a campaign uses the campaign's packs and variant
 * rules and ignores its own (play-and-campaigns.md). The campaign context owns that, and the character context may not
 * import it, so the adapter lives in the composition root. `InMemoryAttachedCampaignPacks` is for tests.
 */
export abstract class AttachedCampaignPacks {
  /** The campaign the character is attached to; none when it is in no campaign. */
  public abstract of(characterId: CharacterId): Promise<AttachedCampaign | undefined>;

  /** The other characters in the campaign the character is attached to, by name; none when it is in no campaign. */
  public abstract alliesOf(characterId: CharacterId): Promise<readonly CampaignAlly[]>;
}
