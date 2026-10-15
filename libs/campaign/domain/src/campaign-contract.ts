import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Campaign } from './campaign';
import {
  CampaignId,
  CampaignInviteId,
  CampaignMemberId,
  CampaignName,
  CharacterId,
  EnabledPackId,
  EnabledVariantRuleId,
  InviteToken,
} from './campaign-fields';
import { InviteSummary } from './campaign-invite';
import { CampaignPacks } from './campaign-packs';
import { CampaignParty } from './campaign-party';
import { CampaignRoster } from './campaign-roster';
import { CampaignVariantRules, EnableVariantRuleBody } from './campaign-variant-rules';

const ById = z.object({ id: CampaignId });
const ByInvite = z.object({ id: CampaignId, inviteId: CampaignInviteId });
const ByMember = z.object({ id: CampaignId, memberId: CampaignMemberId });
const ByCharacter = z.object({ id: CampaignId, characterId: CharacterId });
const ByPack = z.object({ id: CampaignId, packId: EnabledPackId });
const ByVariantRule = z.object({ id: CampaignId, variantId: EnabledVariantRuleId });

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

/** Which of the actor's characters joins the party. */
export const AttachCharacterBody = z.object({ characterId: CharacterId });
export type AttachCharacterBody = z.infer<typeof AttachCharacterBody>;

/** Which pack the GM enables. */
export const EnablePackBody = z.object({ packId: EnabledPackId });
export type EnablePackBody = z.infer<typeof EnablePackBody>;

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
  /** The campaigns the actor runs and has archived (ADR-0062), in the order they joined them. */
  archived: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/archived',
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
  /**
   * GM only: archives the campaign, which then reads as missing to everyone, the GM's archived list aside. Its
   * members, party, packs and invites are left as they are. Archiving twice is harmless.
   */
  archive: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/archive',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: Campaign.codec,
  }),
  /** GM only: brings an archived campaign back as it was. Restoring a live one is harmless. */
  restore: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/restore',
    params: ById,
    query: NoQuery,
    body: NoBody,
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
  /** The characters in the party, and the actor's own characters they could bring. */
  party: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/party',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CampaignParty,
  }),
  /**
   * A member brings one of their own characters into the party. Another user's character is a 404; one
   * already in another campaign is a 409. Attaching it twice is harmless.
   */
  attachCharacter: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/characters',
    params: ById,
    query: NoQuery,
    body: AttachCharacterBody,
    response: CampaignParty,
  }),
  /** The character's owner or the GM takes it out of the party. Detaching it twice is harmless. */
  detachCharacter: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/characters/:characterId',
    params: ByCharacter,
    query: NoQuery,
    body: NoBody,
    response: CampaignParty,
  }),
  /** The packs the campaign uses, and, for the GM, the ones they could add. */
  packs: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/packs',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CampaignPacks,
  }),
  /**
   * GM only: enables a pack they may read, with the packs it extends. A private pack is a 409 asking for it to be
   * shared with campaigns first; one they cannot read is a 404. Enabling it twice is harmless.
   */
  enablePack: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/packs',
    params: ById,
    query: NoQuery,
    body: EnablePackBody,
    response: CampaignPacks,
  }),
  /**
   * GM only: stops the campaign using a homebrew pack. Official packs are always on, and a pack an enabled pack
   * extends stays on: each is a 409. Disabling it twice is harmless.
   */
  disablePack: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/packs/:packId',
    params: ByPack,
    query: NoQuery,
    body: NoBody,
    response: CampaignPacks,
  }),
  /** The variant rules the campaign has enabled, and, for the GM, the ones they could enable. */
  variantRules: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id/variant-rules',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CampaignVariantRules,
  }),
  /**
   * GM only: enables a variant rule of a pack the campaign uses. One no such pack defines is a 404. Enabling it twice is
   * harmless.
   */
  enableVariantRule: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns/:id/variant-rules',
    params: ById,
    query: NoQuery,
    body: EnableVariantRuleBody,
    response: CampaignVariantRules,
  }),
  /** GM only: stops the campaign using a variant rule. Disabling it twice is harmless. */
  disableVariantRule: new Endpoint({
    method: HttpMethod.Delete,
    path: '/campaigns/:id/variant-rules/:variantId',
    params: ByVariantRule,
    query: NoQuery,
    body: NoBody,
    response: CampaignVariantRules,
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
