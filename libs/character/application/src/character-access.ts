import { isCustomEffectPatch, isOverridePatch } from '@pioneer/character/domain';
import type { Character, CharacterId, CharacterPatch, OverrideRole } from '@pioneer/character/domain';
import { ForbiddenError, NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import type { CharacterCampaignRoles } from './character-campaign-roles';
import { CharacterStanding, overrideRoleOf, standingWith } from './character-policy';
import type { CharacterRepository } from './character-repository';

/** A character an actor may make an edit to, and the role their override edits carry. */
export interface EditableCharacter {
  readonly character: Character;
  /** What the actor's override edits are marked as. */
  readonly actorRole: OverrideRole;
}

/** An edit and the character it is for. */
interface EditRequest {
  readonly id: CharacterId;
  readonly patch: CharacterPatch;
}

/** What access to a character is looked up in: its row, and who is what in its campaign. */
export interface CharacterAccessPorts {
  readonly repository: CharacterRepository;
  readonly roles: CharacterCampaignRoles;
}

/**
 * One of the actor's characters, or one in a campaign they are the GM of. Anyone else's is a 404, the same as a
 * missing one.
 */
export async function readableCharacter(
  { repository, roles }: CharacterAccessPorts,
  actor: UserId,
  id: CharacterId,
): Promise<Character> {
  const character = await repository.findById(id);
  if (character === undefined) {
    throw new NotFoundError('Character', id);
  }
  const standing = await standingWith(actor, character, roles);
  if (standing !== CharacterStanding.Owner && standing !== CharacterStanding.Gm) {
    throw new NotFoundError('Character', id);
  }
  return character;
}

/**
 * The character `patch` is for, and what the actor is to it. The owner may make any edit. The GM of its campaign
 * may make override and custom effect edits only; any other edit of theirs is a 404, as for a stranger. A player of the campaign who
 * is not its owner is refused an override or custom effect edit with a 403, and any other edit with a 404.
 */
export async function editableCharacter(
  { repository, roles }: CharacterAccessPorts,
  actor: UserId,
  { id, patch }: EditRequest,
): Promise<EditableCharacter> {
  const character = await repository.findById(id);
  if (character === undefined) {
    throw new NotFoundError('Character', id);
  }
  const standing = await standingWith(actor, character, roles);
  const isOverride = isOverridePatch(patch) || isCustomEffectPatch(patch);
  if (standing === CharacterStanding.Owner || (standing === CharacterStanding.Gm && isOverride)) {
    return { character, actorRole: overrideRoleOf(standing) };
  }
  if (standing === CharacterStanding.Member && isOverride) {
    throw new ForbiddenError(`Only the GM edits the overrides and custom effects of character ${id}`);
  }
  throw new NotFoundError('Character', id);
}
