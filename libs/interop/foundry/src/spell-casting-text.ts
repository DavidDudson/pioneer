import {
  ActionCost,
  CastTimeType,
  DieSize,
  SpellDurationEnd,
  SpellDurationType,
  SpellRangeType,
  SpellTimeUnit,
  TurnOwner,
} from '@pioneer/rules/sdk';

/**
 * Foundry's casting time, range and duration, which it stores as English text ("1 to 3", "500 feet", "until the end
 * of the target's next turn"), as Pioneer's casting structures (ADR-0021). Each parser takes the whole text or
 * nothing: undefined means the wording has no mapping, and the caller reports it. The schema checks what comes back.
 */

/** "touch or 30 feet", "10 minutes or 8 hours": a choice, each side a wording of its own. */
const OR = ' or ';

/** A range's or duration's choice; both name it `either`. */
const EITHER = SpellRangeType.Either;

/** Each side of an "or", parsed; undefined unless there are two or more and every one maps. */
function eitherOf(value: string, parse: (text: string) => object | undefined): object | undefined {
  const parts = value.split(OR);
  const options = parts.map(parse).filter((option) => option !== undefined);
  return parts.length > 1 && options.length === parts.length ? { type: EITHER, options } : undefined;
}

/** Foundry's glyph counts and words for a casting time in actions. */
const ACTION_COSTS: ReadonlyMap<string, ActionCost> = new Map([
  ['1', ActionCost.One],
  ['2', ActionCost.Two],
  ['3', ActionCost.Three],
  ['reaction', ActionCost.Reaction],
  ['free', ActionCost.Free],
]);

/** "1 to 3", "1 or 2": the caster picks how many actions. */
const ACTION_RANGE = /^(?<from>\d) (?:to|or) (?<to>\d)$/u;

/** "10 minutes", "1 day": a count of a unit, singular or plural. */
const TIME = /^(?<count>\d+) (?<unit>round|minute|hour|day|week|month|year)s?$/u;

const TIME_UNITS: ReadonlyMap<string, SpellTimeUnit> = new Map(
  Object.values(SpellTimeUnit).map((unit) => [unit, unit]),
);

function words(text: string): string {
  return text.trim().toLowerCase();
}

/** `{ count, unit }` from "10 minutes", or undefined. */
function timeOf(text: string): object | undefined {
  const groups = TIME.exec(text)?.groups;
  const unit = TIME_UNITS.get(groups?.['unit'] ?? '');
  return unit === undefined ? undefined : { count: Number(groups?.['count']), unit };
}

/** A casting time: action glyphs ("2", "reaction", "1 to 3"), or time ("10 minutes", "1 day"). */
export function castTimeOf(text: string): object | undefined {
  const value = words(text);
  const cost = ACTION_COSTS.get(value);
  if (cost !== undefined) {
    return { type: CastTimeType.Actions, cost };
  }
  const range = ACTION_RANGE.exec(value)?.groups;
  if (range !== undefined) {
    const from = ACTION_COSTS.get(range['from'] ?? '');
    const upTo = ACTION_COSTS.get(range['to'] ?? '');
    return from === undefined || upTo === undefined ? undefined : { type: CastTimeType.Actions, cost: from, upTo };
  }
  const time = timeOf(value);
  return time && { type: CastTimeType.Time, ...time };
}

/** "30 feet", "1,000 feet". */
const FEET = /^(?<feet>\d[\d,]*) feet$/u;

/** "100 miles", "1 mile". */
const MILES = /^(?<miles>\d[\d,]*) miles?$/u;

const HALF_A_MILE = 'half a mile';
const HALF = 0.5;

const RANGE_WORDS: ReadonlyMap<string, SpellRangeType> = new Map([
  ['touch', SpellRangeType.Touch],
  ['planetary', SpellRangeType.Planetary],
  ['interplanar', SpellRangeType.Interplanar],
  ['unlimited', SpellRangeType.Unlimited],
]);

function countOf(digits: string): number {
  return Number(digits.replaceAll(',', ''));
}

/** A range that is no choice: feet, miles, `touch`, `planetary`, `interplanar` or `unlimited`. */
function singleRangeOf(value: string): object | undefined {
  const type = RANGE_WORDS.get(value);
  if (type !== undefined) {
    return { type };
  }
  if (value === HALF_A_MILE) {
    return { type: SpellRangeType.Miles, miles: HALF };
  }
  const feet = FEET.exec(value)?.groups?.['feet'];
  if (feet !== undefined) {
    return { type: SpellRangeType.Feet, feet: countOf(feet) };
  }
  const miles = MILES.exec(value)?.groups?.['miles'];
  return miles === undefined ? undefined : { type: SpellRangeType.Miles, miles: countOf(miles) };
}

/** A range, or a choice of them ("touch or 30 feet"). "varies" and "see text" have no mapping. */
export function rangeOf(text: string): object | undefined {
  const value = words(text);
  return singleRangeOf(value) ?? eitherOf(value, singleRangeOf);
}

/** The moment an `until` duration ends, by Foundry's wordings of it. */
const UNTIL: ReadonlyMap<string, object> = new Map([
  ['until the end of your turn', { until: SpellDurationEnd.TurnEnd }],
  ['until the end of the current turn', { until: SpellDurationEnd.TurnEnd }],
  ['until the start of your next turn', { until: SpellDurationEnd.NextTurnStart }],
  ['until the end of your next turn', { until: SpellDurationEnd.NextTurnEnd }],
  ["until the end of the target's next turn", { until: SpellDurationEnd.NextTurnEnd, of: TurnOwner.Target }],
  ["until the end of your target's next turn", { until: SpellDurationEnd.NextTurnEnd, of: TurnOwner.Target }],
  ['until your next daily preparations', { until: SpellDurationEnd.DailyPreparations }],
  ['until the next time you make your daily preparations', { until: SpellDurationEnd.DailyPreparations }],
]);

/** Foundry's `duration`: its text, and whether the spell is sustained. */
export interface FoundryDurationText {
  readonly value: string;
  readonly sustained: boolean;
}

/** Wordings that leave the duration to the text, mostly by degree of success. */
const VARIES: ReadonlySet<string> = new Set([
  'varies',
  'see text',
  'see below',
  '1 or more rounds',
  '1 or more rounds (see below)',
]);

/** "up to 10 minutes": a time the caster may end sooner. */
const UP_TO = 'up to ';

/** "sustained up to 1 minute", one side of a choice. */
const SUSTAINED_UP_TO = 'sustained up to ';

/** "4d12 hours": dice of a unit. */
const ROLLED = /^(?<dice>\d+)(?<die>d(?:4|6|8|10|12)) (?<unit>round|minute|hour|day|week|month|year)s?$/u;

const DIE_SIZES: ReadonlyMap<string, DieSize> = new Map(Object.values(DieSize).map((die) => [die, die]));

/** `{ type: rolled, dice, die, unit }` from "4d12 hours", or undefined. */
function rolledOf(value: string): object | undefined {
  const groups = ROLLED.exec(value)?.groups;
  const die = DIE_SIZES.get(groups?.['die'] ?? '');
  const unit = TIME_UNITS.get(groups?.['unit'] ?? '');
  return die === undefined || unit === undefined
    ? undefined
    : { type: SpellDurationType.Rolled, dice: Number(groups?.['dice']), die, unit };
}

/** A time, up to a time, or sustained up to a time, as the wording says. */
function timedOf(value: string): object | undefined {
  const time = timeOf(value);
  if (time !== undefined) {
    return { type: SpellDurationType.Time, ...time };
  }
  for (const [prefix, flag] of [
    [SUSTAINED_UP_TO, { sustained: true }],
    [UP_TO, { upTo: true }],
  ] as const) {
    const limit = value.startsWith(prefix) ? timeOf(value.slice(prefix.length)) : undefined;
    if (limit !== undefined) {
      return { type: SpellDurationType.Time, ...limit, ...flag };
    }
  }
  return rolledOf(value);
}

/** A duration that is no choice and not sustained by Foundry's flag. */
function singleDurationOf(value: string): object | undefined {
  if (value === SpellDurationType.Unlimited) {
    return { type: SpellDurationType.Unlimited };
  }
  if (VARIES.has(value)) {
    return { type: SpellDurationType.Varies };
  }
  const until = UNTIL.get(value);
  return until ? { type: SpellDurationType.Until, ...until } : timedOf(value);
}

/**
 * A duration: a time ("1 minute", sustained up to it when `sustained`, "up to 10 minutes"), rolled ("4d12 hours"),
 * `sustained` with no limit, `until` a moment, `unlimited`, `varies` when the text says, or a choice of them ("10
 * minutes or 8 hours"). A choice spells out which side is sustained ("1 round or sustained up to 1 minute"). Blank text
 * is no duration at all (an instant spell) and is the caller's to skip.
 */
export function durationOf({ value: text, sustained }: FoundryDurationText): object | undefined {
  const value = words(text);
  if (value === '' && sustained) {
    return { type: SpellDurationType.Sustained };
  }
  const either = VARIES.has(value) ? undefined : eitherOf(value, singleDurationOf);
  if (either !== undefined) {
    // Foundry's flag on a choice with no sustained side is a sustain the wording doesn't place.
    return !sustained || value.includes(SUSTAINED_UP_TO) ? either : undefined;
  }
  if (!sustained) {
    return singleDurationOf(value);
  }
  const time = timeOf(value);
  return time && { type: SpellDurationType.Time, ...time, sustained };
}
