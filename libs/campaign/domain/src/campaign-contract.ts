import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Campaign } from './campaign';
import { CampaignId, CampaignInviteId, CampaignMemberId, CampaignName, InviteToken } from './campaign-fields';
import { InviteSummary } from './campaign-invite';
import { CampaignRoster } from './campaign-roster';

const ById = z.object({ id: CampaignId });
const ByInvite = z.object({ id: CampaignId, inviteId: CampaignInviteId });
const ByMember = z.object({ id: CampaignId, memberId: CampaignMemberId });

/** An empty answer: the request did what it says. */
const Done = z.strictObject({});

export const CreateCampaignBody = z.object({ name: CampaignName });
export type CreateCampaignBody = z.infer<typeof CreateCampaignBody>;

/** What creating an invite returns: the invite, and its token, which is never shown again. */
export const IssuedInvite = z.object({ invite: InviteSummary, token: InviteToken });
export type IssuedInvite = z.output<typeof IssuedInvite>;

export const JoinCampaignBody = z.object({ token: InviteToken });
export type JoinCampaignBody = z.infer<typeof JoinCampaignBody>;

/** Who becomes the GM: one of the campaign's members. */
export const TransferGmBody = z.object({ memberId: CampaignMemberId });
export type TransferGmBody = z.infer<typeof TransferGmBody>;

/** The campaign HTTP API, shared by `campaign-infrastructure` and `campaign-feature`. */
export const CampaignContract = {
  /** The actor's campaigns, in the order they joined them. */
  list: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: z.array(Campaign.codec),
  }),
  get: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: Campaign.codec,
  }),
  create: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns',
    params: NoParams,
    query: NoQuery,
    body: CreateCampaignBody,
    response: Campaign.codec,
  }),
  /** The campaign's members with their names, and the actor's own role. */
  roster: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/members',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CampaignRoster,
  }),
  /** GM only: takes a player out of the campaign; they lose access at once. Removing them twice is harmless. */
  removeMember: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/members/:memberId',
    params: ByMember,
    query: NoQuery,
    body: NoBody,
    response: CampaignRoster,
  }),
  /** GM only: hands the GM role to another member; the GM stays on as a player. */
  transferGm: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/gm',
    params: ById,
    query: NoQuery,
    body: TransferGmBody,
    response: CampaignRoster,
  }),
  /** A player leaves the campaign. The GM can't: they hand the role over first. */
  leave: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/leave',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: Done,
  }),
  /** GM only: invites that still work, newest first. */
  invites: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/invites',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: z.array(InviteSummary),
  }),
  /** GM only: a new invite link. The token is in this response and nowhere else. */
  createInvite: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/invites',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: IssuedInvite,
  }),
  /** GM only: stop an invite from working. Revoking twice is harmless. */
  revokeInvite: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/invites/:inviteId',
    params: ByInvite,
    query: NoQuery,
    body: NoBody,
    response: InviteSummary,
  }),
  /**
   * Join the campaign an invite token belongs to, as a player. A member who joins again gets the
   * campaign back unchanged. The token goes in the body and the invite link carries it in its
   * fragment, so it is never in a URL a server sees.
   */
  join: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/join',
    params: NoParams,
    query: NoQuery,
    body: JoinCampaignBody,
    response: Campaign.codec,
  }),
} as const;
