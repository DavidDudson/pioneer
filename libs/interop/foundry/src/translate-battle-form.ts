import { RuleElementKey } from '@pioneer/rules/sdk';

import { fromFoundryFormula } from './foundry-formula';
import { typeOf } from './translate-defences';
import { sizeOf } from './translate-modifiers';
import { senseElement, withSense } from './translate-senses';
import type { SenseContext } from './translate-senses';

export type { FoundrySenses } from './translate-senses';
export { withFormSpeedBrackets } from './translate-form-speeds';

/**
 * Foundry's `BattleForm` as Pioneer's: the form's `overrides` become `form`, each of its `brackets` (`start` rank and
 * `value`) a heightened change, each of its `variants` (a `predicate` and the statistics it changes) a variant, and the name-keyed records (skills, senses, Strikes) lists. Fields Pioneer does not
 * read stay where they are, so the element fails and is kept for the backlog.
 */

type Fields = Readonly<Record<string, unknown>>;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A formula or number of Foundry's, a formula in Pioneer's reference spelling; anything else as it is. */
function formula(value: unknown): unknown {
  return typeof value === 'string' ? fromFoundryFormula(value) : value;
}

/** `fields` with each of `names` that it has run through `formula`. */
function withFormulas(fields: Fields, names: readonly string[]): Fields {
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [name, names.includes(name) ? formula(value) : value]),
  );
}

/** A record of name to fields as a list of what `shape` makes of each; anything else as it is. */
function listed(record: unknown, shape: (name: string, fields: Fields) => unknown): unknown {
  if (!isFields(record)) {
    return record;
  }
  return Object.entries(record).map(([name, fields]) => (isFields(fields) ? shape(name, fields) : fields));
}

/** `lowLightVision` as the slug `low-light-vision`. */
function kebab(name: string): string {
  return name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

function skill(name: string, fields: Fields): unknown {
  return { skill: `skill:${name}`, ...withFormulas(fields, ['modifier']) };
}

function sense(name: string, fields: Fields, context: SenseContext): unknown {
  const element = senseElement(kebab(name), fields, context);
  if (!isFields(element)) {
    return { sense: name, ...fields };
  }
  return Object.fromEntries(Object.entries(element).filter(([field]) => field !== 'key'));
}

/** A Strike's range as Pioneer's one number: Foundry's `increment`, or its `max` when it has no increment. */
function rangeOf(range: unknown): unknown {
  return isFields(range) ? (range['increment'] ?? range['max']) : range;
}

/** A Strike's name as the slug it is listed under: `hurled debris` is `hurled-debris`. */
function slugOf(name: string): string {
  return name.trim().toLowerCase().replaceAll(/\s+/gu, '-');
}

function strike(name: string, fields: Fields): unknown {
  const { range, damage, img: _img, ...rest } = withFormulas(fields, ['modifier']);
  const changes: Record<string, unknown> = { slug: slugOf(name), ...rest };
  if (range !== undefined) {
    changes['range'] = rangeOf(range);
  }
  if (damage !== undefined) {
    changes['damage'] = isFields(damage) ? withFormulas(damage, ['modifier']) : damage;
  }
  return changes;
}

/** Weaknesses, resistances or immunities with one entry per type Foundry lists, the `value` read as a formula. */
function defences(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }
  return value.flatMap((item: unknown): unknown[] => {
    if (!isFields(item)) {
      return [item];
    }
    const { type, ...rest } = withFormulas(item, ['value']);
    const types: readonly unknown[] = Array.isArray(type) ? type : [type];
    const entries: unknown[] = [];
    for (const each of types) {
      entries.push({ type: typeOf(each), ...rest });
    }
    return entries;
  });
}

type Translator = (value: unknown, context: SenseContext) => unknown;

/** How each statistic of a form is translated; any other is kept as written. */
const STATISTICS: ReadonlyMap<string, Translator> = new Map<string, Translator>([
  ['armorClass', (value) => (isFields(value) ? withFormulas(value, ['modifier']) : value)],
  ['size', (value) => sizeOf(value)],
  ['tempHP', (value) => formula(value)],
  ['skills', (value) => listed(value, skill)],
  ['senses', (value, context) => listed(value, (name, fields) => sense(name, fields, context))],
  ['strikes', (value) => listed(value, strike)],
  ['weaknesses', (value) => defences(value)],
  ['resistances', (value) => defences(value)],
  ['immunities', (value) => defences(value)],
]);

/** The statistics of a form or of one of its brackets. */
function statistics(raw: unknown, context: SenseContext): unknown {
  if (!isFields(raw)) {
    return raw;
  }
  return Object.fromEntries(
    Object.entries(raw).map(([name, value]) => [
      name,
      (STATISTICS.get(name) ?? ((same: unknown) => same))(value, context),
    ]),
  );
}

/** A variant: its `predicate` kept, the statistics it changes translated as a form's are. */
function variant(raw: unknown, context: SenseContext): unknown {
  if (!isFields(raw)) {
    return raw;
  }
  const { predicate, ...rest } = raw;
  const changes = statistics(rest, context);
  return { predicate, ...(isFields(changes) ? changes : {}) };
}

function bracket(raw: unknown, context: SenseContext): unknown {
  if (!isFields(raw) || !isFields(raw['value'])) {
    return raw;
  }
  const { value, ...rest } = raw;
  const changes = statistics(value, context);
  return { ...rest, ...(isFields(changes) ? changes : {}) };
}

/**
 * What the Battle Form trait forbids in a form (#531): casting, speaking and anything that needs hands, unless Foundry
 * says the form has hands. Foundry leaves these to the system, so the importer states them for the engine to read.
 */
const BATTLE_FORM_LIMITS = { canCast: false, canSpeak: false, hasHands: false };

/** A `BattleForm` as Pioneer's, with its base fields kept; any other element as it is. */
function withBattleForm(raw: unknown, context: SenseContext): unknown {
  if (!isFields(raw) || raw['key'] !== RuleElementKey.BattleForm || !isFields(raw['overrides'])) {
    return raw;
  }
  const { overrides, brackets, variants, hasHands, ...rest } = raw;
  const statistic = statistics(overrides, context);
  const form = {
    ...BATTLE_FORM_LIMITS,
    ...(hasHands === undefined ? {} : { hasHands }),
    ...(isFields(statistic) ? statistic : {}),
  };
  return {
    ...rest,
    form,
    ...(Array.isArray(brackets) ? { brackets: brackets.map((item) => bracket(item, context)) } : {}),
    ...(Array.isArray(variants) ? { variants: variants.map((item) => variant(item, context)) } : {}),
  };
}

/** A creature statistic rule (`Sense`, `BattleForm`) as Pioneer's; any other element as it is. */
export function withCreatureRule(raw: unknown, context: SenseContext): unknown {
  return withBattleForm(withSense(raw, context), context);
}
