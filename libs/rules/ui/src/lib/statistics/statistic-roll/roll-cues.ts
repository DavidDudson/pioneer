import { RollLuck, RollTone } from '@pioneer/frontier';
import { LineStatusKind, RollEffectStatusKind } from '@pioneer/rules/engine';
import type { RollEffectStatus, StatisticValue } from '@pioneer/rules/engine';
import { RollKept } from '@pioneer/rules/sdk';

/** What a roll button shows beyond its modifier. */
export interface RollCues {
  /** Green for a net bonus from the applied lines, red for a net penalty. */
  readonly tone: RollTone;
  /** Fortune or misfortune that applies; both together cancel. */
  readonly luck: RollLuck;
  /** An applied effect shifts the degree of success. */
  readonly shifted: boolean;
  /** Something would change the roll in some situation: a conditional line or effect not yet in play. */
  readonly conditional: boolean;
}

function isConditional(status: RollEffectStatus): boolean {
  return status.kind === RollEffectStatusKind.Conditional;
}

function isApplied(status: RollEffectStatus): boolean {
  return status.kind === RollEffectStatusKind.Applied;
}

function toneOf(statistic: StatisticValue): RollTone {
  const net = statistic.lines
    .filter(({ status }) => status.kind === LineStatusKind.Applied)
    .reduce((sum, { value }) => sum + (value ?? 0), 0);
  if (net > 0) {
    return RollTone.Bonus;
  }
  return net < 0 ? RollTone.Penalty : RollTone.Neutral;
}

function luckOf(statistic: StatisticValue): RollLuck {
  const applied = (statistic.rollEffects?.rollTwice ?? []).filter(({ status }) => isApplied(status));
  const fortune = applied.some(({ keep }) => keep === RollKept.Higher);
  const misfortune = applied.some(({ keep }) => keep === RollKept.Lower);
  if (fortune === misfortune) {
    return RollLuck.None;
  }
  return fortune ? RollLuck.Fortune : RollLuck.Misfortune;
}

/**
 * The cues of a check's roll button: text colour from the sign of what applies, the background from fortune or
 * misfortune, the border from a shifted degree of success, and whether to mark conditional lines with an asterisk. A
 * line another beats ("beaten by") would change nothing, so it is no reason for an asterisk.
 */
export function rollCues(statistic: StatisticValue): RollCues {
  const effects = statistic.rollEffects;
  return {
    tone: toneOf(statistic),
    luck: luckOf(statistic),
    shifted: (effects?.degreeAdjustments ?? []).some(({ status }) => isApplied(status)),
    conditional:
      statistic.lines.some(
        ({ status }) => status.kind === LineStatusKind.Conditional && status.beatenBy === undefined,
      ) ||
      (effects?.rollTwice ?? []).some(({ status }) => isConditional(status)) ||
      (effects?.degreeAdjustments ?? []).some(({ status }) => isConditional(status)),
  };
}
