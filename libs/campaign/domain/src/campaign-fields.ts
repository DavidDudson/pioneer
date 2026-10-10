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

export const CampaignInviteId = Uuid.brand<'CampaignInviteId'>();
export type CampaignInviteId = z.infer<typeof CampaignInviteId>;

/** The secret in an invite link: 256 random bits, base64url without padding. Shown once, never stored. */
export const InviteToken = z
  .string()
  .regex(/^[\w-]{43}$/u)
  .brand<'InviteToken'>();
export type InviteToken = z.infer<typeof InviteToken>;

/** SHA-256 of an `InviteToken`, lowercase hex. The only form a token is stored in. */
export const InviteTokenHash = z
  .string()
  .regex(/^[\da-f]{64}$/u)
  .brand<'InviteTokenHash'>();
export type InviteTokenHash = z.infer<typeof InviteTokenHash>;

/** A member's name as identity shows it; the campaign context only displays it. */
export const MemberName = z.string().min(1).brand<'MemberName'>();
export type MemberName = z.infer<typeof MemberName>;
