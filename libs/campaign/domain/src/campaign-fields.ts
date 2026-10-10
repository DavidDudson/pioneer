import { Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** Branded so a campaign id can't be passed where another id is expected. */
export const CampaignId = Uuid.brand<'CampaignId'>();
export type CampaignId = z.infer<typeof CampaignId>;

/** Row id of one membership; the audit log keys every row by an `id`. */
export const CampaignMemberId = Uuid.brand<'CampaignMemberId'>();
export type CampaignMemberId = z.infer<typeof CampaignMemberId>;

export const CAMPAIGN_NAME_MAX_LENGTH = 80;

export const CampaignName = z.string().trim().min(1).max(CAMPAIGN_NAME_MAX_LENGTH).brand<'CampaignName'>();
export type CampaignName = z.infer<typeof CampaignName>;

/** A member's part in a campaign. Exactly one member is the GM. */
export const CampaignRole = { Gm: 'gm', Player: 'player' } as const;
export type CampaignRole = ValueOf<typeof CampaignRole>;
