import type { PlayState } from '@pioneer/character/domain';

import { sameConditions } from './sheet-conditions';
import { sameEffects } from './sheet-effects';

/** What a derivation reads of the play state: the conditions and effects active now, and the toggles as the player left them. */
export type PlayedInputs = Pick<PlayState, 'conditions' | 'effects' | 'toggles'>;

/** Whether two reads of the play state hold the same inputs, so an edit that leaves them alone derives nothing again. */
export function samePlayed(left: PlayedInputs | undefined, right: PlayedInputs | undefined): boolean {
  return (
    sameConditions(left?.conditions, right?.conditions) &&
    sameEffects(left?.effects, right?.effects) &&
    JSON.stringify(left?.toggles) === JSON.stringify(right?.toggles)
  );
}
