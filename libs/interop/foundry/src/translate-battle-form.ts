import { RuleElementKey } from '@pioneer/rules/sdk';
import { present } from '@pioneer/shared/kernel';

import { kebab } from './foundry-flags';
import { fromFoundryFormula } from './foundry-formula';
import { slugify } from './foundry-slug';
import { isFields } from './translate-choice-reads';
import type { Fields } from './translate-choice-reads';
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

/** A record of name to fields as a list of what `build` makes of each; anything else as it is. */
function listed(record: unknown, build: (name: string, fields: Fields) => unknown): unknown {
  if (!isFields(record)) {
    return record;
  }

  return Object.entries(record).map(([name, fields]) => (isFields(fields) ? build(name, fields) : fields));
}

function skill(name: string, fields: Fields): Fields {
  return { skill: `skill:${name}`, ...withFormulas(fields, ['modifier']) };
}

function sense(name: string, fields: Fields, context: SenseContext): Fields {
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

function strike(name: string, fields: Fields): Fields {
  const { range, damage, img: _img, ...rest } = withFormulas(fields, ['modifier']);

  return {
    slug: slugify(name),
    ...rest,
    ...present({ range: range === undefined ? undefined : rangeOf(range) }),
    ...present({ damage: isFields(damage) ? withFormulas(damage, ['modifier']) : damage }),
  };
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
function variant<Raw>(raw: Raw, context: SenseContext): Raw | Fields {
  if (!isFields(raw)) {
    return raw;
  }

  const { predicate, ...rest } = raw;
  const changes = statistics(rest, context);

  const changed = isFields(changes) ? changes : {};

  return { predicate, ...changed };
}

function bracket<Raw>(raw: Raw, context: SenseContext): Raw | Fields {
  if (!isFields(raw) || !isFields(raw['value'])) {
    return raw;
  }

  const { value, ...rest } = raw;
  const changes = statistics(value, context);

  const changed = isFields(changes) ? changes : {};

  return { ...rest, ...changed };
}

/**
 * What the Battle Form trait forbids in a form (#531): casting, speaking and anything that needs hands, unless Foundry
 * says the form has hands. Foundry leaves these to the system, so the importer states them for the engine to read.
 */
const BATTLE_FORM_LIMITS = { canCast: false, canSpeak: false, hasHands: false };

/** A `BattleForm` as Pioneer's, with its base fields kept; any other element as it is. */
function withBattleForm<Raw>(raw: Raw, context: SenseContext): Raw | Fields {
  if (!isFields(raw) || raw['key'] !== RuleElementKey.BattleForm || !isFields(raw['overrides'])) {
    return raw;
  }

  const { overrides, brackets, variants, hasHands, ...rest } = raw;
  const statistic = statistics(overrides, context);

  const form = {
    ...BATTLE_FORM_LIMITS,
    ...present({ hasHands }),
    ...(isFields(statistic) ? statistic : undefined),
  };

  return {
    ...rest,
    form,
    ...present({
      brackets: Array.isArray(brackets) ? brackets.map((item: unknown) => bracket(item, context)) : undefined,
    }),
    ...present({
      variants: Array.isArray(variants) ? variants.map((item: unknown) => variant(item, context)) : undefined,
    }),
  };
}

/** A creature statistic rule (`Sense`, `BattleForm`) as Pioneer's; any other element as it is. */
export function withCreatureRule(raw: unknown, context: SenseContext): unknown {
  return withBattleForm(withSense(raw, context), context);
}
