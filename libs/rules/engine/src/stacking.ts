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

/** A typed line with its value: one that competes within its type and direction. */
interface Competing {
  readonly line: BreakdownLine;
  readonly value: FormulaValue;
  readonly key: StackKey;
}

function typed(line: BreakdownLine): Competing | undefined {
  const { value, modifier } = line;
  if (value === undefined || modifier.type === ModifierType.Untyped) {
    return undefined;
  }
  const direction = value < 0 ? Direction.Penalty : Direction.Bonus;
  return { line, value, key: StackKey.parse(`${modifier.type}:${direction}`) };
}

function competing(line: BreakdownLine): Competing | undefined {
  return line.status.kind === LineStatusKind.Applied ? typed(line) : undefined;
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

/** An applied line that lost to the winner of its type and direction, suppressed by it. */
function suppressed(line: BreakdownLine, best: ReadonlyMap<StackKey, Competing>): BreakdownLine {
  const competitor = competing(line);
  const winner = competitor === undefined ? undefined : best.get(competitor.key);
  return winner === undefined || winner.line === line
    ? line
    : {
        ...line,
        status: { kind: LineStatusKind.Suppressed, by: winner.line.modifier.id, reason: SuppressionReason.Stacking },
      };
}

/**
 * A conditional line, beaten by the applied winner of its type and direction when that is at least as large: even
 * when its situation holds, it would not change the total. A tie is beaten too, whatever the ids.
 */
function outmatched(line: BreakdownLine, best: ReadonlyMap<StackKey, Competing>): BreakdownLine {
  const { status } = line;
  const candidate = typed(line);
  const winner = candidate === undefined ? undefined : best.get(candidate.key);
  if (
    status.kind !== LineStatusKind.Conditional ||
    candidate === undefined ||
    winner === undefined ||
    Math.abs(winner.value) < Math.abs(candidate.value)
  ) {
    return line;
  }
  return { ...line, status: { ...status, beatenBy: winner.line.modifier.id } };
}

/**
 * PF2e stacking (Player Core, "Bonuses and Penalties"): within each type only the highest bonus and the lowest
 * penalty apply, and untyped ones all apply. Losers stay in the breakdown, suppressed by the line that beat them.
 * Equal values tie-break on the modifier id, so the result does not depend on the order of the lines. Only applied
 * lines take part; a conditional line no better than the applied winner of its type and direction is marked beaten
 * by it, and the others pass through.
 */
export function stack(lines: readonly BreakdownLine[]): BreakdownLine[] {
  const best = winners(lines);
  return lines.map((line) =>
    line.status.kind === LineStatusKind.Conditional ? outmatched(line, best) : suppressed(line, best),
  );
}
