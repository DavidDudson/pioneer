import type { FormulaValue } from '@pioneer/rules/formula';
import { ModifierType } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { LineStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine } from './breakdown';

/** Bonuses and penalties of one type stack apart: the best bonus and the worst penalty each apply. */
const Direction = { Bonus: 'bonus', Penalty: 'penalty' } as const;
type Direction = ValueOf<typeof Direction>;

/** A type and a direction (`status:penalty`): the lines that compete with one another. */
const StackKey = z.string().brand<'StackKey'>();
type StackKey = z.infer<typeof StackKey>;

/** An applied, typed line with its value: one that competes within its type and direction. */
interface Competing {
  readonly line: BreakdownLine;
  readonly value: FormulaValue;
  readonly key: StackKey;
}

function competing(line: BreakdownLine): Competing | undefined {
  const { value, status, modifier } = line;
  if (status.kind !== LineStatusKind.Applied || value === undefined || modifier.type === ModifierType.Untyped) {
    return undefined;
  }
  const direction = value < 0 ? Direction.Penalty : Direction.Bonus;
  return { line, value, key: StackKey.parse(`${modifier.type}:${direction}`) };
}

/** Whether `challenger` beats `holder`: a bigger bonus or a bigger penalty, then the smaller id, so ties settle. */
function beats(challenger: Competing, holder: Competing): boolean {
  if (challenger.value !== holder.value) {
    return Math.abs(challenger.value) > Math.abs(holder.value);
  }
  return challenger.line.modifier.id < holder.line.modifier.id;
}

/** The winning line of each type and direction. */
function winners(lines: readonly BreakdownLine[]): ReadonlyMap<StackKey, Competing> {
  const best = new Map<StackKey, Competing>();
  for (const challenger of lines.map((line) => competing(line))) {
    const holder = challenger === undefined ? undefined : best.get(challenger.key);
    if (challenger !== undefined && (holder === undefined || beats(challenger, holder))) {
      best.set(challenger.key, challenger);
    }
  }
  return best;
}

/**
 * PF2e stacking (Player Core, "Bonuses and Penalties"): within each type only the highest bonus and the lowest
 * penalty apply, and untyped ones all apply. Losers stay in the breakdown, suppressed by the line that beat them.
 * Equal values tie-break on the modifier id, so the result does not depend on the order of the lines. Only applied
 * lines take part; the others pass through.
 */
export function stack(lines: readonly BreakdownLine[]): BreakdownLine[] {
  const best = winners(lines);
  return lines.map((line) => {
    const competitor = competing(line);
    const winner = competitor === undefined ? undefined : best.get(competitor.key);
    return winner === undefined || winner.line === line
      ? line
      : {
          ...line,
          status: { kind: LineStatusKind.Suppressed, by: winner.line.modifier.id, reason: SuppressionReason.Stacking },
        };
  });
}
