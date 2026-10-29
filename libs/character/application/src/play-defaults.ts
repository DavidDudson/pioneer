import {
  NO_COUNTED,
  NO_ENVIRONMENT_GROUPS,
  NO_RESOURCES,
  NO_SHIELDS,
  NO_STAFF,
  SpendTime,
  WandProblem,
} from '@pioneer/character/domain';
import type { ConditionValued, PlayLimits, RecoveryConditions, SpendLimits } from '@pioneer/character/domain';
import { HitPoints } from '@pioneer/rules/sdk';

/** The maximum handed to edits that don't read it, so none has to be derived for them. */
export const NO_MAX_HIT_POINTS = HitPoints.parse(0);

/** The condition content handed to edits that don't read it. */
export const NO_VALUED: ConditionValued = new Map();

/** What Rest reads from the build and the content. */
export interface RestContent {
  readonly healing: HitPoints;
  readonly recovery: RecoveryConditions;
}

/** The Rest content handed to edits that don't read it. */
export const NO_REST: RestContent = { healing: NO_MAX_HIT_POINTS, recovery: new Map() };

export const WAND_MESSAGES = {
  [WandProblem.NotHeld]: 'character.validation.wandNotHeld',
  [WandProblem.Broken]: 'character.validation.wandBroken',
  [WandProblem.NotCastable]: 'character.validation.wandNotCastable',
  [WandProblem.UseSpent]: 'character.validation.wandUseSpent',
  [WandProblem.UseLeft]: 'character.validation.wandUseLeft',
  [WandProblem.RollMissing]: 'character.validation.wandRollMissing',
} as const satisfies Record<WandProblem, string>;

/** The spend limits handed to edits that don't spend, so no time has to be read for them. */
const NO_SPEND: SpendLimits = { now: SpendTime.parse('1970-01-01T00:00:00.000Z') };

/** The limits a turn-cycle edit reads: the maximum Hit Points, the effects and which conditions are valued, and nothing else. */
export function turnLimits(
  hitPoints: HitPoints,
  effects: PlayLimits['effects'],
  valued: PlayLimits['valued'],
): PlayLimits {
  return {
    hitPoints,
    healing: NO_MAX_HIT_POINTS,
    recovery: NO_REST.recovery,
    resources: NO_RESOURCES,
    counted: NO_COUNTED,
    staff: NO_STAFF,
    valued,
    effects,
    environmentGroups: NO_ENVIRONMENT_GROUPS,
    shields: NO_SHIELDS,
    spend: NO_SPEND,
  };
}
