import type { DamageTone } from '@pioneer/frontier';
import { TermKind } from '@pioneer/rules/dice';
import type { DiceTermResult, FortunedRoll, RollResult, RollTotal, TermResult } from '@pioneer/rules/dice';
import type { DamageType } from '@pioneer/rules/sdk';

import { DAMAGE_TYPE_KEYS } from '../roll-labels';
import { damageTone } from './damage-tone';

/** The die sizes the dice library has a model for; a term of any other size is only shown in the toast. */
const DRAWN_SIZES: ReadonlySet<string> = new Set(['4', '6', '8', '10', '12', '20', '100']);

/** Dice of one term for the animation to land on: library notation with the faces the engine rolled, and its colour. */
export interface DiceGroup {
  /** `2d10@1,10`: the dice, then the faces to land on. */
  readonly notation: string;
  readonly tone: DamageTone | undefined;
}

/** What one damage type came to, across its dice and flat terms. */
interface DamageLine {
  readonly total: number;
  readonly tone: DamageTone | undefined;
  /** The message key of the type's name; unset for the terms that carry no type. */
  readonly typeKey: string | undefined;
}

/** A finished roll as the stage shows it: the dice to throw, then the pill that names the result. */
export interface RollPresentation {
  readonly id: number;
  readonly label: string;
  readonly total: RollTotal;
  /** One line per damage type, in the order the types are first written; an untyped roll has one plain line. */
  readonly lines: readonly DamageLine[];
  readonly groups: readonly DiceGroup[];
}

function isDiceTerm(entry: TermResult): boolean {
  return entry.term.kind === TermKind.Dice;
}

function groupOf(term: DiceTermResult): DiceGroup {
  const faces = term.dice.map(({ face }) => face).join(',');
  return { notation: `${term.dice.length}d${term.term.size}@${faces}`, tone: damageTone(term.term.tags.type) };
}

/** Sums the terms per damage type, dice and flat alike; the terms without a type share one line. */
function linesOf(terms: readonly TermResult[]): DamageLine[] {
  const sums = new Map<DamageType | undefined, number>();
  for (const { term, value } of terms) {
    sums.set(term.tags.type, (sums.get(term.tags.type) ?? 0) + value);
  }
  return [...sums].map(([type, total]) => ({
    total,
    tone: damageTone(type),
    typeKey: type === undefined ? undefined : DAMAGE_TYPE_KEYS[type],
  }));
}

/** What the roll of `result` looks like on the stage; the engine's faces are the ones the dice land on. */
export function presentRoll(id: number, label: string, result: RollResult): RollPresentation {
  const dice = result.terms.filter((entry): entry is DiceTermResult => isDiceTerm(entry));
  return {
    id,
    label,
    total: result.total,
    lines: linesOf(result.terms),
    groups: dice.filter(({ term }) => DRAWN_SIZES.has(String(term.size))).map((term) => groupOf(term)),
  };
}

/** The roll that counted of a fortuned roll, the one fortune or misfortune kept; unset only for a roll with none. */
export function keptRoll(roll: FortunedRoll): RollResult | undefined {
  return roll.rolls.find(({ kept }) => kept)?.result;
}
