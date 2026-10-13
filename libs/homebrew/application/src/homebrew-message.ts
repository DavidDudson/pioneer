/** Why a pack request was refused; the `en` text is in homebrew-feature's bundle. */
export const HomebrewMessage = {
  SlugTaken: 'homebrew.pack.slugTaken',
  CampaignsEnableIt: 'homebrew.pack.campaignsEnableIt',
  DependsOnItself: 'homebrew.pack.dependsOnItself',
  DependencyCycle: 'homebrew.pack.dependencyCycle',
  DependencyNarrower: 'homebrew.pack.dependencyNarrower',
  DependencyInUse: 'homebrew.pack.dependencyInUse',
  WiderThanDependencies: 'homebrew.pack.widerThanDependencies',
  NarrowerThanDependents: 'homebrew.pack.narrowerThanDependents',
} as const;
