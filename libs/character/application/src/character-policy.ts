import type { Character } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Who may read or change a character (ADR-0007): only its owner. Services treat a refusal as
 * not found, so another user's character ids reveal nothing.
 */
export function mayAccessCharacter(actor: UserId, character: Character): boolean {
  return character.ownerId === actor;
}
