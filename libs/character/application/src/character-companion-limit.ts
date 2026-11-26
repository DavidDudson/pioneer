import { COMPANION_LIVE_LIMIT } from '@pioneer/character/domain';
import type { Companion } from '@pioneer/character/domain';
import { ConflictError, message } from '@pioneer/shared/kernel';

import { CharacterCompanionMessage } from './character-companion-message';

/** Whether a character holding `live` companions of the kind has no place left for another. */
export function isKindFull(kind: Companion['kind'], live: number): boolean {
  return live >= COMPANION_LIVE_LIMIT[kind];
}

/**
 * The 409 for a write that would hold more live companions of a kind than allowed (ADR-0079, ADR-0080). A kind that
 * allows one says so in the familiar's words; one that allows several names its limit.
 */
export function kindFullError(characterId: string, kind: Companion['kind'], action: 'add' | 'restore'): ConflictError {
  const limit = COMPANION_LIVE_LIMIT[kind];
  const single = limit === 1;

  const key = {
    add: single ? CharacterCompanionMessage.KindTaken : CharacterCompanionMessage.LimitReached,
    restore: single ? CharacterCompanionMessage.RestoreBlocked : CharacterCompanionMessage.RestoreLimitReached,
  }[action];

  return new ConflictError(`Character ${characterId} already has ${limit} live ${kind}`, message(key, { kind, limit }));
}
