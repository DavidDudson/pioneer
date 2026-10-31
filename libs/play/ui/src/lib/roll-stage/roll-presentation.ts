import type { DamageTone } from '@pioneer/frontier';
import { DieFace, TermKind } from '@pioneer/rules/dice';
import type {
  DamageApplication,
  DamageInstance,
  DiceTermResult,
  FortunedRoll,
  RollResult,
  RollTotal,
  TermResult,
} from '@pioneer/rules/dice';
import type { CheckNode, DamageType, DegreeOfSuccess } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { DAMAGE_TYPE_KEYS, DEGREE_KEYS } from '../roll-labels';
import { outcomeView } from '../roll-view';
import type { OutcomeView } from '../roll-view';
import { damageTone } from './damage-tone';

/** Which natural die a roll earned: a 20 or a 1 on the d20 that counted. */
export const Natural = { High: 'high', Low: 'low' } as const;
export type Natural = ValueOf<typeof Natural>;

const D20 = 20;
const NATURAL_20 = DieFace.parse(20);
const NATURAL_1 = DieFace.parse(1);

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
  /** What the dice came to before a basic save scaled it; unset when nothing did. */
  readonly unadjusted?: number | undefined;
  readonly tone: DamageTone | undefined;
  /** The message key of the type's name; unset for the terms that carry no type. */
  readonly typeKey: string | undefined;
}

/** A finished roll as the stage shows it: the dice to throw, then the toast that names the result. */
export interface RollPresentation {
  readonly id: number;
  readonly label: string;
  readonly total: RollTotal;
  /** One line per damage type, in the order the types are first written; an untyped roll has one plain line. */
  readonly lines: readonly DamageLine[];
  readonly groups: readonly DiceGroup[];
  /** The message key of the degree of success, when the roll was a check against a DC. */
  readonly degreeKey?: string | undefined;
  /** The natural 20 or natural 1 on the d20 that counted; unset for any other roll. */
  readonly natural?: Natural | undefined;
  /** What that degree does, when the check says. */
  readonly outcome?: OutcomeView | undefined;
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

/** A natural 20 or natural 1 on the first d20 that counted (a kept die of a fortune or misfortune pair); unset otherwise. */
function naturalOf(dice: readonly DiceTermResult[]): Natural | undefined {
  const face = dice.find(({ term }) => term.size === D20)?.dice.find(({ kept }) => kept)?.face;
  if (face === NATURAL_20) {
    return Natural.High;
  }
  return face === NATURAL_1 ? Natural.Low : undefined;
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
    natural: naturalOf(dice),
  };
}

/** The roll that counted of a fortuned roll, the one fortune or misfortune kept; unset only for a roll with none. */
export function keptRoll(roll: FortunedRoll): RollResult | undefined {
  return roll.rolls.find(({ kept }) => kept)?.result;
}

/** `presentation` for a check rolled against a DC: the degree it reached, and what that degree does per `check`. */
export function withDegree(
  presentation: RollPresentation,
  degree: DegreeOfSuccess,
  check?: CheckNode,
): RollPresentation {
  return { ...presentation, degreeKey: DEGREE_KEYS[degree], outcome: outcomeView(degree, check) };
}

function savedLine(instance: DamageInstance): DamageLine {
  return {
    total: instance.taken,
    unadjusted: instance.taken === instance.rolled ? undefined : instance.rolled,
    tone: damageTone(instance.type),
    typeKey: instance.type === undefined ? undefined : DAMAGE_TYPE_KEYS[instance.type],
  };
}

/** `presentation` for damage a basic save scaled: each type's line shows what was taken, and what the dice came to. */
export function withSave(presentation: RollPresentation, damage: DamageApplication): RollPresentation {
  return { ...presentation, lines: [...damage.immediate, ...damage.persistent].map((instance) => savedLine(instance)) };
}
