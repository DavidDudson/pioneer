import type { HomebrewPack } from '@pioneer/homebrew/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Who may see a homebrew pack (ADR-0007): its owner. Services treat a refusal as not found, so the ids of other
 * users' packs reveal nothing. Visibility beyond the owner arrives with the pack visibility story.
 */
export function mayViewPack(actor: UserId, pack: HomebrewPack): boolean {
  return pack.ownerId === actor;
}
