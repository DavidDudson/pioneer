/** Every command that writes a campaign row, as named in `audit.log.command`. */
export const CampaignCommand = {
  ArchiveCampaign: 'archiveCampaign',
  RestoreCampaign: 'restoreCampaign',
} as const;
export type CampaignCommand = (typeof CampaignCommand)[keyof typeof CampaignCommand];
