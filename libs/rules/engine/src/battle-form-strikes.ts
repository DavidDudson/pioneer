import type { FormulaValue, ResolveReference } from '@pioneer/rules/formula';
import { Truth } from '@pioneer/rules/predicate';
import { Selector, WeaponCategory } from '@pioneer/rules/sdk';
import type { BattleFormElement, RuleValue } from '@pioneer/rules/sdk';

import { battleFormInPlay, summaryOf } from './battle-form';
import type { FormInPlay } from './battle-form';
import { proficiencyBonuses } from './proficiency-bonuses';
import { NO_ITEM } from './rule-in-play';
import type { ModifierInputs } from './rule-in-play';
import { truthOf, valueOf, whole } from './rule-value';
import type { WeaponInputs } from './source-inputs';
import { resolverFor } from './statistic-inputs';
import { FormSource } from './statistic-result';
import type { FormReplacement, StatisticResult, StatisticValue } from './statistic-result';
import type { StrikeScope } from './strike-rules';

type FormStrike = NonNullable<NonNullable<BattleFormElement['form']['strikes']>[number]>;

/** The weapons a character's Strikes are made from, and the statistics derived for them. */
export interface StrikeSources {
  readonly weapons: readonly WeaponInputs[];
  readonly results: ReadonlyMap<Selector, StatisticResult>;
}

const ATTACK = 'strike';
const DAMAGE = 'strike-damage';

/** The rule elements in play and what they are read against: `StrikeRulesInput`, which `strikes.ts` defines. */
export interface FormStrikeRules {
  readonly inputs: ModifierInputs;
  readonly scope: StrikeScope;
}

const isUnarmed = ({ category }: WeaponInputs): boolean => category === WeaponCategory.Unarmed;

/** A statistic that is a single number, as the form gives the attack modifier and the flat damage. */
function plain(selector: Selector, total: FormulaValue, form?: FormReplacement): StatisticValue {
  return {
    ok: true,
    selector,
    base: [],
    formulaValue: total,
    baseValue: total,
    lines: [],
    computed: total,
    total,
    overrides: [],
    pinnedBy: undefined,
    ...(form === undefined ? {} : { form }),
  };
}

/** The best attack modifier among the character's own unarmed Strikes; none when it has no unarmed Strike. */
function ownUnarmedAttack({ weapons, results }: StrikeSources): FormulaValue | undefined {
  let best = undefined as FormulaValue | undefined;
  for (const unarmed of weapons.filter((weapon) => isUnarmed(weapon))) {
    const result = results.get(Selector.parse(`${ATTACK}:${unarmed.slug}`));
    if (result?.ok === true && (best === undefined || result.total > best)) {
      best = result.total;
    }
  }
  return best;
}

function numberOf(value: RuleValue | undefined, resolve: ResolveReference): FormulaValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  const outcome = valueOf(value, resolve);
  return outcome.ok ? whole(outcome.value) : undefined;
}

/** What the form's attack modifier and the character's own unarmed one make: the higher stands. */
function attackOf(slug: FormStrike['slug'], { form, formValue, own }: Attack): StatisticValue | undefined {
  const selector = Selector.parse(`${ATTACK}:${slug}`);
  if (formValue === undefined || own === undefined) {
    const only = formValue ?? own;
    return only === undefined ? undefined : plain(selector, only);
  }
  const ownStands = own >= formValue;
  const total = ownStands ? own : formValue;
  const parts = {
    source: ownStands ? FormSource.Own : FormSource.Form,
    rule: form.id,
    label: form.label,
    base: formValue,
    value: formValue,
    own,
  };
  return plain(selector, total, { ...parts, summary: summaryOf(form, parts) });
}

interface Attack {
  readonly form: FormInPlay;
  readonly formValue: FormulaValue | undefined;
  readonly own: FormulaValue | undefined;
}

/** The weapon a form Strike is derived as: an unarmed attack unless the form says otherwise, credited to the form. */
function weaponOf(strike: FormStrike, form: FormInPlay): WeaponInputs {
  const { dice, die, damageType } = strike.damage ?? {};
  return {
    slug: strike.slug,
    category: strike.category ?? WeaponCategory.Unarmed,
    traits: strike.traits ?? [],
    range: strike.range,
    label: strike.label,
    damage:
      dice === undefined || damageType === undefined
        ? undefined
        : { dice, damageType, ...(die === undefined ? {} : { die }) },
    origin: form.origin,
  };
}

interface Reading {
  readonly form: FormInPlay;
  readonly own: FormulaValue | undefined;
  readonly resolve: ResolveReference;
}

/** A form Strike's weapon, with the attack and flat damage statistics the form gives it. */
function madeFrom(strike: FormStrike, { form, own, resolve }: Reading): StrikeSources {
  const weapon = weaponOf(strike, form);
  const attack = attackOf(strike.slug, { form, formValue: numberOf(strike.modifier, resolve), own });
  const flat = numberOf(strike.damage?.modifier, resolve);
  const results = new Map<Selector, StatisticResult>();
  if (attack !== undefined) {
    results.set(attack.selector, attack);
  }
  if (flat !== undefined) {
    const selector = Selector.parse(`${DAMAGE}:${strike.slug}`);
    results.set(selector, plain(selector, flat));
  }
  return { weapons: [weapon], results };
}

function readerFor({ inputs, scope }: FormStrikeRules): ResolveReference {
  const { rules, facts } = inputs;
  const proficiency = proficiencyBonuses(scope.statistics.proficiencyBonus, {
    rules,
    facts,
    level: scope.character.level,
  });
  return resolverFor({ inputs: scope.character, proficiency }, (): undefined => undefined, { item: NO_ITEM });
}

/**
 * The weapons and statistics a character's Strikes come from while a battle form is in force (rules-engine.md,
 * "Battle forms"): the form's Strikes replace the character's weapon Strikes, and only its unarmed ones stay when the
 * form `keepsOwnUnarmed`. A form Strike's attack modifier is the form's or, when higher, the character's own best
 * unarmed one; its damage is the form's dice and type plus the form's flat damage. Without a form, nothing changes.
 */
export function strikesUnderForm(sources: StrikeSources, rules: FormStrikeRules): StrikeSources {
  const form = battleFormInPlay(rules.inputs);
  if (form === undefined) {
    return sources;
  }
  const reading = { form, own: ownUnarmedAttack(sources), resolve: readerFor(rules) };
  const strikes = (form.form.strikes ?? []).filter(
    ({ predicate }) => predicate === undefined || truthOf(predicate, rules.inputs.facts) === Truth.True,
  );
  const made = strikes.map((strike) => madeFrom(strike, reading));
  const kept = form.form.keepsOwnUnarmed === true ? sources.weapons.filter((each) => isUnarmed(each)) : [];
  const results = new Map(sources.results);
  for (const { results: given } of made) {
    for (const [selector, result] of given) {
      results.set(selector, result);
    }
  }
  return { weapons: [...kept, ...made.flatMap(({ weapons }) => weapons)], results };
}
