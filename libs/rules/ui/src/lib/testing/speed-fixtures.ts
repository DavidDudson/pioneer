import { StatisticKind } from '@pioneer/rules/sdk';

import type { SpeedRow } from '../speeds/speed-rows.component';
import { Movement } from '../speeds/speeds-messages';
import { statistic, term } from './breakdown-fixtures';

const LAND_SPEED = 25;
const FLY_SPEED = 30;

/** A character that only walks: 25 feet, and no swim or fly Speed. */
export const WALKER_SPEEDS: readonly SpeedRow[] = [
  {
    movement: Movement.Walk,
    speed: {
      name: 'Speed',
      kind: StatisticKind.Value,
      result: statistic('speed:walk', { base: [term('25', LAND_SPEED)] }),
    },
  },
];

/** A winged character: walks 25 feet and flies 30. */
export const FLYER_SPEEDS: readonly SpeedRow[] = [
  ...WALKER_SPEEDS,
  {
    movement: Movement.Fly,
    speed: {
      name: 'Fly Speed',
      kind: StatisticKind.Value,
      result: statistic('speed:fly', { base: [term('30', FLY_SPEED)] }),
    },
  },
];
