import { Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import type { BattleFormBracket, BattleFormElement, Level } from '@pioneer/rules/sdk';

import { truthOf } from './rule-value';

type Form = BattleFormElement['form'];
type Strike = NonNullable<Form['strikes']>[number];

/** `base` with each change laid over the item it names (by `keyOf`), and the ones it adds after; undefined for neither. */
function overlaid<Item extends object>(
  base: readonly Item[] | undefined,
  changes: readonly Item[] | undefined,
  keyOf: (item: Item) => unknown,
): readonly Item[] | undefined {
  if (changes === undefined) {
    return base;
  }
  const kept = base ?? [];
  const changed = kept.map((item) => {
    const change = changes.find((each) => keyOf(each) === keyOf(item));
    return change === undefined ? item : { ...item, ...change };
  });
  return [...changed, ...changes.filter((change) => !kept.some((item) => keyOf(item) === keyOf(change)))];
}

/** A Strike with the change laid over it; the damage is laid over too, so a change can name only the damage bonus. */
function strikeOver(base: Strike, change: Strike): Strike {
  const damage =
    base.damage === undefined && change.damage === undefined ? {} : { damage: { ...base.damage, ...change.damage } };
  return { ...base, ...change, ...damage };
}

function strikesOver(base: Form['strikes'], changes: Form['strikes']): Form['strikes'] {
  if (changes === undefined) {
    return base;
  }
  const kept = base ?? [];
  const changed = kept.map((strike) => {
    const change = changes.find(({ slug }) => slug === strike.slug);
    return change === undefined ? strike : strikeOver(strike, change);
  });
  return [...changed, ...changes.filter(({ slug }) => !kept.some((strike) => strike.slug === slug))];
}

/** What a bracket or a variant changes. */
type Change = Omit<BattleFormBracket, 'start'>;

/** The form with what one bracket or variant changes: a statistic it names is laid over the form's, the rest stays. */
function withChange(form: Form, change: Change): Form {
  const { armorClass, speeds, skills, senses, strikes, immunities, weaknesses, resistances, ...whole } = change;
  return {
    ...form,
    ...whole,
    ...(armorClass === undefined ? {} : { armorClass: { ...form.armorClass, ...armorClass } }),
    ...(speeds === undefined ? {} : { speeds: { ...form.speeds, ...speeds } }),
    skills: overlaid(form.skills, skills, ({ skill }) => skill),
    senses: overlaid(form.senses, senses, ({ sense }) => sense),
    strikes: strikesOver(form.strikes, strikes),
    immunities: overlaid(form.immunities, immunities, ({ type }) => type),
    weaknesses: overlaid(form.weaknesses, weaknesses, ({ type }) => type),
    resistances: overlaid(form.resistances, resistances, ({ type }) => type),
  };
}

/**
 * The form at the spell rank of the item it sits on (`@item.level`): the base form with each bracket that starts at
 * or below that rank laid over it, lowest first, so a Huge Plant Form at rank 6 still has the low-light vision and
 * the poison resistance the rank 5 form gave. With no rank, or no brackets, it is the base form. Then each variant
 * whose predicate holds for `facts` is laid over it, in the order the element lists them.
 */
export function heightened(
  { form, brackets, variants }: BattleFormElement,
  level: Level | undefined,
  facts: PredicateFacts,
): Form {
  let result = form;
  const applying =
    level === undefined || brackets === undefined
      ? []
      : brackets
          .filter(({ start }) => Number(start) <= Number(level))
          .toSorted((left, right) => Number(left.start) - Number(right.start));
  for (const { start: _start, ...change } of applying) {
    result = withChange(result, change);
  }
  for (const { predicate, ...change } of variants ?? []) {
    if (truthOf(predicate, facts) === Truth.True) {
      result = withChange(result, change);
    }
  }
  return result;
}
