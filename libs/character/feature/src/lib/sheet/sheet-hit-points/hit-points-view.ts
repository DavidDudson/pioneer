import type { HitPointsState } from '@pioneer/character/domain';
import { currentHitPoints } from '@pioneer/character/domain';
import type { HitPoints } from '@pioneer/rules/sdk';

/** Hit Points as the sheet shows them. */
export interface HitPointsView {
  readonly current: HitPoints;
  readonly max: HitPoints;
  readonly temp: HitPoints;
}

/** The character's Hit Points: undefined until there is a maximum and the play state has loaded. */
export function hitPointsView(max: HitPoints | undefined, hp: HitPointsState | undefined): HitPointsView | undefined {
  return max === undefined || hp === undefined ? undefined : { current: currentHitPoints(hp, max), max, temp: hp.temp };
}

/** The words for how hurt a character is, as flavour under the bar. */
export const HitPointsStateMessage = {
  Bloodied: 'character.sheet.hp.state.bloodied',
  Critical: 'character.sheet.hp.state.critical',
  Down: 'character.sheet.hp.state.down',
} as const;
export type HitPointsStateMessage = (typeof HitPointsStateMessage)[keyof typeof HitPointsStateMessage];

/** Half of the maximum: at or under it the character is bloodied. */
const BLOODIED_SHARE = 0.5;
/** A quarter of the maximum: at or under it the character is near death. */
const CRITICAL_SHARE = 0.25;

/** How hurt `hp` is, as a message key; undefined while the character is above half. */
export function stateMessageOf({ current, max }: HitPointsView): HitPointsStateMessage | undefined {
  if (current <= 0) {
    return HitPointsStateMessage.Down;
  }
  if (current <= max * CRITICAL_SHARE) {
    return HitPointsStateMessage.Critical;
  }
  return current <= max * BLOODIED_SHARE ? HitPointsStateMessage.Bloodied : undefined;
}
