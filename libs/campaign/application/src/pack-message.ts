/** Why a pack change was refused; the `en` text is in campaign-feature's bundle. */
export const PackMessage = {
  Private: 'campaign.packs.private',
  DependencyUnreadable: 'campaign.packs.dependencyUnreadable',
  AlwaysOn: 'campaign.packs.alwaysOnRefusal',
  RequiredBy: 'campaign.packs.requiredByRefusal',
  Changed: 'campaign.packs.changed',
} as const;
