import { InstantCodec, UserId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import * as z from 'zod';

import {
  CharacterId,
  ConditionLevel,
  ConditionName,
  MemberName,
  PartyCharacterLevel,
  PartyCharacterName,
  PartyCharacterOrigin,
  VitalDying,
  VitalHitPoints,
} from './campaign-fields';
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
  /** What its build picked; absent while the slot is empty. */
  ancestry: PartyCharacterOrigin.optional(),
  class: PartyCharacterOrigin.optional(),
});
export type OwnedCharacter = z.output<typeof OwnedCharacter>;

/** A character's Hit Points as the table has them. */
export const PartyHitPoints = z.object({ current: VitalHitPoints, max: VitalHitPoints, temp: VitalHitPoints });
export type PartyHitPoints = z.output<typeof PartyHitPoints>;

/** A condition on a character: its name, and its value when it is valued. */
export const PartyCondition = z.object({ name: ConditionName, value: ConditionLevel.optional() });
export type PartyCondition = z.output<typeof PartyCondition>;

/**
 * How a character stands, as every member of the campaign sees it: worked out from its play state on every read,
 * never stored. A character with no maximum yet, and an archived one, have no Hit Points.
 */
export const PartyVitals = z.object({
  hp: PartyHitPoints.optional(),
  /** The dying value, 0 when not dying; a dead character is at the highest. */
  dying: VitalDying,
  /** The death track's conditions first (`dying`, `wounded`, `doomed`), then the others, each once at its highest value. */
  conditions: z.array(PartyCondition).readonly(),
});
export type PartyVitals = z.output<typeof PartyVitals>;

/** A character with nothing to show: not dying, no conditions and no Hit Points. */
export const NO_VITALS: PartyVitals = PartyVitals.parse({ dying: 0, conditions: [] });

/** One character in the party, with the name its owner goes by. */
export const PartyCharacter = OwnedCharacter.extend({
  ownerId: UserId,
  ownerName: MemberName,
  attachedAt: InstantCodec,
  /** Whether the viewer may detach it: its owner or the GM. */
  detachable: z.boolean(),
  /** Whether its owner has archived it (ADR-0062). It stays in the party, shown as a placeholder, and comes back when restored. */
  archived: z.boolean(),
  vitals: PartyVitals,
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
