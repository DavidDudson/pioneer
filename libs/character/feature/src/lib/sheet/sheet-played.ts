import type { PlayState } from '@pioneer/character/domain';

import { sameConditions } from './sheet-conditions';

/** What a derivation reads of the play state: the conditions active now, and the toggles as the player left them. */
export type PlayedInputs = Pick<PlayState, 'conditions' | 'toggles'>;

/** Whether two reads of the play state hold the same inputs, so an edit that leaves them alone derives nothing again. */
export function samePlayed(left: PlayedInputs | undefined, right: PlayedInputs | undefined): boolean {
  return (
    sameConditions(left?.conditions, right?.conditions) &&
    JSON.stringify(left?.toggles) === JSON.stringify(right?.toggles)
  );
}
