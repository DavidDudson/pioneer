import { InstantCodec, UserId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterId, MemberName, PartyCharacterLevel, PartyCharacterName } from './campaign-fields';
import type { CampaignCharacterId, CampaignMemberId } from './campaign-fields';

/**
 * A character attached to a campaign by the member who owns it. A character is in one campaign at
 * most; it leaves with its member.
 */
export interface CampaignCharacter {
  readonly id: CampaignCharacterId;
  readonly characterId: CharacterId;
  /** The membership of the character's owner. */
  readonly memberId: CampaignMemberId;
  readonly attachedAt: Temporal.Instant;
}

/** One of the viewer's own characters, as the attach picker lists it. */
export const OwnedCharacter = z.object({
  characterId: CharacterId,
  name: PartyCharacterName,
  level: PartyCharacterLevel,
});
export type OwnedCharacter = z.output<typeof OwnedCharacter>;

/** One character in the party, with the name its owner goes by. */
export const PartyCharacter = OwnedCharacter.extend({
  ownerId: UserId,
  ownerName: MemberName,
  attachedAt: InstantCodec,
  /** Whether the viewer may detach it: its owner or the GM. */
  detachable: z.boolean(),
});
export type PartyCharacter = z.output<typeof PartyCharacter>;

/** JSON shape of a campaign's party, as one of its members sees it. */
export const CampaignParty = z.object({
  /** Oldest attachment first. */
  characters: z.array(PartyCharacter).readonly(),
  /** The viewer's characters that are in no campaign yet, by name. */
  attachable: z.array(OwnedCharacter).readonly(),
});
export type CampaignParty = z.output<typeof CampaignParty>;
