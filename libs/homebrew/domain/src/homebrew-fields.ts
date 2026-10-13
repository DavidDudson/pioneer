import * as z from 'zod';

/** How many entries a pack holds, as the content context counts them. */
export const EntryCount = z.int().nonnegative().brand<'EntryCount'>();
export type EntryCount = z.infer<typeof EntryCount>;

/** A pack with nothing in it yet. */
export const NO_ENTRIES = EntryCount.parse(0);

/** A campaign's name as the campaign context shows it; homebrew only names the ones that enable a pack. */
export const EnablingCampaignName = z.string().min(1).brand<'EnablingCampaignName'>();
export type EnablingCampaignName = z.infer<typeof EnablingCampaignName>;

/** An entry's name as the content context shows it; homebrew only names the ones that use a dependency. */
export const UsingEntryName = z.string().min(1).brand<'UsingEntryName'>();
export type UsingEntryName = z.infer<typeof UsingEntryName>;
