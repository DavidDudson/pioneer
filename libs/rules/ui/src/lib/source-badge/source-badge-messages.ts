import { SourceType } from '@pioneer/rules/sdk';

/** Message keys the source badge renders with, spelled out so the key check sees them. */
export const SourceBadgeMessage = {
  AriaLabel: 'rules.sourceBadge.ariaLabel',
  Expanded: 'rules.sourceBadge.expanded',
  UnregisteredBook: 'rules.sourceBadge.unregisteredBook',
  Homebrew: 'rules.sourceBadge.homebrew',
  Web: 'rules.sourceBadge.web',
  Type: 'rules.sourceBadge.type.label',
  ProductLine: 'rules.sourceBadge.row.productLine',
  Authors: 'rules.sourceBadge.row.authors',
  Publisher: 'rules.sourceBadge.row.publisher',
  License: 'rules.sourceBadge.row.license',
  Released: 'rules.sourceBadge.row.released',
  Errata: 'rules.sourceBadge.row.errata',
  FoundryVersion: 'rules.sourceBadge.row.foundryVersion',
  Page: 'rules.sourceBadge.row.page',
  AonEntry: 'rules.sourceBadge.link.aonEntry',
  AonBook: 'rules.sourceBadge.link.aonBook',
  Store: 'rules.sourceBadge.link.store',
  Open: 'rules.sourceBadge.link.open',
} as const;

/** What each type of source is called, in words, so the colour is never the only signal. */
export const SOURCE_TYPE_MESSAGES: Readonly<Record<SourceType, string>> = {
  [SourceType.RulebookRemaster]: 'rules.sourceBadge.type.rulebookRemaster',
  [SourceType.RulebookLegacy]: 'rules.sourceBadge.type.rulebookLegacy',
  [SourceType.LostOmensRemaster]: 'rules.sourceBadge.type.lostOmensRemaster',
  [SourceType.LostOmensLegacy]: 'rules.sourceBadge.type.lostOmensLegacy',
  [SourceType.CampaignRemaster]: 'rules.sourceBadge.type.campaignRemaster',
  [SourceType.CampaignLegacy]: 'rules.sourceBadge.type.campaignLegacy',
  [SourceType.AdventureRemaster]: 'rules.sourceBadge.type.adventureRemaster',
  [SourceType.AdventureLegacy]: 'rules.sourceBadge.type.adventureLegacy',
  [SourceType.SocietyRemaster]: 'rules.sourceBadge.type.societyRemaster',
  [SourceType.SocietyLegacy]: 'rules.sourceBadge.type.societyLegacy',
  [SourceType.Homebrew]: 'rules.sourceBadge.type.homebrew',
  [SourceType.Web]: 'rules.sourceBadge.type.web',
  [SourceType.Unknown]: 'rules.sourceBadge.type.unknown',
};
