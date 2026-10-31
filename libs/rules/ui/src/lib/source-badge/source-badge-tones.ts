import { BadgeTone, BadgeVariant } from '@pioneer/frontier';
import { SourceType } from '@pioneer/rules/sdk';

/** A badge's colour: the hue says the kind of book, the fill says the edition. */
export interface SourceTone {
  readonly tone: BadgeTone;
  readonly variant: BadgeVariant;
}

const remaster = (tone: BadgeTone): SourceTone => ({ tone, variant: BadgeVariant.Solid });
const legacy = (tone: BadgeTone): SourceTone => ({ tone, variant: BadgeVariant.Subtle });

/**
 * One hue per kind of book (rulebook, setting, campaign, adventure, Society), solid for the remaster and tinted for the
 * legacy. Homebrew is solid neutral; a web page and a source Pioneer cannot place are tinted neutral. The theme has six
 * hues, so a seventh kind needs a new ramp in frontier before it can have a colour of its own.
 */
export const SOURCE_TONES: Readonly<Record<SourceType, SourceTone>> = {
  [SourceType.RulebookRemaster]: remaster(BadgeTone.Accent),
  [SourceType.RulebookLegacy]: legacy(BadgeTone.Accent),
  [SourceType.LostOmensRemaster]: remaster(BadgeTone.Info),
  [SourceType.LostOmensLegacy]: legacy(BadgeTone.Info),
  [SourceType.CampaignRemaster]: remaster(BadgeTone.Success),
  [SourceType.CampaignLegacy]: legacy(BadgeTone.Success),
  [SourceType.AdventureRemaster]: remaster(BadgeTone.Warning),
  [SourceType.AdventureLegacy]: legacy(BadgeTone.Warning),
  [SourceType.SocietyRemaster]: remaster(BadgeTone.Danger),
  [SourceType.SocietyLegacy]: legacy(BadgeTone.Danger),
  [SourceType.Homebrew]: remaster(BadgeTone.Neutral),
  [SourceType.Web]: legacy(BadgeTone.Neutral),
  [SourceType.Unknown]: legacy(BadgeTone.Neutral),
};
