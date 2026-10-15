/** The commands that archive and restore a homebrew pack, as named in `audit.log.command`. */
export const HomebrewCommand = {
  ArchivePack: 'archiveHomebrewPack',
  RestorePack: 'restoreHomebrewPack',
} as const;
export type HomebrewCommand = (typeof HomebrewCommand)[keyof typeof HomebrewCommand];
