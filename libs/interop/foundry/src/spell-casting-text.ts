import {
  ActionCost,
  CastTimeType,
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

const RANGE_WORDS: ReadonlyMap<string, SpellRangeType> = new Map([
  ['touch', SpellRangeType.Touch],
  ['planetary', SpellRangeType.Planetary],
  ['unlimited', SpellRangeType.Unlimited],
]);

/** A range: feet, `touch`, `planetary` or `unlimited`. Miles and "varies" have no mapping. */
export function rangeOf(text: string): object | undefined {
  const value = words(text);
  const type = RANGE_WORDS.get(value);
  if (type !== undefined) {
    return { type };
  }
  const feet = FEET.exec(value)?.groups?.['feet'];
  return feet === undefined ? undefined : { type: SpellRangeType.Feet, feet: Number(feet.replaceAll(',', '')) };
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

/**
 * A duration: a time ("1 minute", sustained up to it when `sustained`), `sustained` with no limit, `until` a moment,
 * or `unlimited`. Blank text is no duration at all (an instant spell) and is the caller's to skip.
 */
export function durationOf({ value: text, sustained }: FoundryDurationText): object | undefined {
  const value = words(text);
  if (value === '' && sustained) {
    return { type: SpellDurationType.Sustained };
  }
  const time = timeOf(value);
  if (time !== undefined) {
    return { type: SpellDurationType.Time, ...time, ...(sustained ? { sustained } : {}) };
  }
  if (sustained) {
    return undefined;
  }
  if (value === SpellDurationType.Unlimited) {
    return { type: SpellDurationType.Unlimited };
  }
  const until = UNTIL.get(value);
  return until && { type: SpellDurationType.Until, ...until };
}
