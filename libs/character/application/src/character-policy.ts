import { OverrideRole } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { UserId, ValueOf } from '@pioneer/shared/kernel';

import type { CharacterCampaignRoles } from './character-campaign-roles';

/**
 * Who may read or change a character (ADR-0007): only its owner. Services treat a refusal as
 * not found, so another user's character ids reveal nothing.
 */
export function mayAccessCharacter(actor: UserId, character: Character): boolean {
  return character.ownerId === actor;
}

/** What an actor is to a character: its owner, the GM or a player of the campaign it is in, or nobody to it. */
export const CharacterStanding = { Owner: 'owner', Gm: 'gm', Member: 'member', Stranger: 'stranger' } as const;
export type CharacterStanding = ValueOf<typeof CharacterStanding>;

/** The actor's standing with `character`: ownership comes first, so a GM's own character is theirs as a player. */
export async function standingWith(
  actor: UserId,
  character: Character,
  roles: CharacterCampaignRoles,
): Promise<CharacterStanding> {
  if (mayAccessCharacter(actor, character)) {
    return CharacterStanding.Owner;
  }
  const role = await roles.roleOf(character.id, actor);
  if (role === undefined) {
    return CharacterStanding.Stranger;
  }
  return role === OverrideRole.Gm ? CharacterStanding.Gm : CharacterStanding.Member;
}

/** What an actor with `standing` writes into an override: a GM is the GM, anyone else the player. */
export function overrideRoleOf(standing: CharacterStanding): OverrideRole {
  return standing === CharacterStanding.Gm ? OverrideRole.Gm : OverrideRole.Player;
}
