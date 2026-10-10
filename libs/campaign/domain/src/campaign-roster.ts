import * as z from 'zod';

import { CampaignMemberWire } from './campaign';
import { CampaignRole, MemberName } from './campaign-fields';

/** One member with the name identity knows them by. */
export const NamedMember = CampaignMemberWire.extend({ displayName: MemberName });
export type NamedMember = z.output<typeof NamedMember>;

/** JSON shape of a campaign's member list, as one of its members sees it. */
export const CampaignRoster = z.object({
  /** The role of the member asking, so the page knows whether to offer GM tools. */
  viewerRole: z.enum(CampaignRole),
  /** Oldest membership first. */
  members: z.array(NamedMember).readonly(),
});
export type CampaignRoster = z.output<typeof CampaignRoster>;
