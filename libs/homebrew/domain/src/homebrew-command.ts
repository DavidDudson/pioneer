/** The commands that write a homebrew pack and its entries, as named in `audit.log.command`. */
export const HomebrewCommand = {
  ArchivePack: 'archiveHomebrewPack',
  RestorePack: 'restoreHomebrewPack',
  CreateEntry: 'createHomebrewEntry',
  UpdateEntry: 'updateHomebrewEntry',
  ArchiveEntry: 'archiveHomebrewEntry',
  RestoreEntry: 'restoreHomebrewEntry',
} as const;

export type HomebrewCommand = (typeof HomebrewCommand)[keyof typeof HomebrewCommand];
