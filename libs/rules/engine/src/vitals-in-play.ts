import { Truth } from '@pioneer/rules/predicate';
import { FastHealingType, Feet, HitPoints, RuleElementKey, Size } from '@pioneer/rules/sdk';
import type {
  CreatureSizeElement,
  DamageType,
  FastHealingElement,
  ModifierValue,
  Origin,
  RuleValue,
  SizeSteps,
  TempHPElement,
} from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { battleFormInPlay } from './battle-form';
import type { FormInPlay } from './battle-form';
import type { StatisticContent } from './derive-statistics';
import { proficiencyBonuses } from './proficiency-bonuses';
import { itemScopeOf, NO_ITEM } from './rule-in-play';
import type { ItemScope, ModifierInputs, RuleInPlay } from './rule-in-play';
import { truthOf, valueOf } from './rule-value';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

/** Hit Points regained at the start of each turn, from the highest `FastHealing` element of one kind. */
export interface RecoveryInPlay {
  readonly type: ValueOf<typeof FastHealingType>;
  readonly amount: HitPoints;
  /** Damage of these types switches it off until the next turn; empty when nothing does. */
  readonly deactivatedBy: readonly DamageType[];
  /** Every element that gives this amount of this kind, in the order found. */
  readonly origins: readonly Origin[];
}

/** Temporary Hit Points elements give: the most any gives. */
export interface TemporaryHitPointsInPlay {
  readonly amount: HitPoints;
  /** Every element that gives this amount, in the order found. */
  readonly origins: readonly Origin[];
}

/** The character's size after its `CreatureSize` elements. */
export interface SizeInPlay {
  readonly size: Size;
  /** The size the character had before any element changed it. */
  readonly base: Size;
  readonly reach: Feet;
  /** Whether the gear grows or shrinks with the character: some element says so. */
  readonly resizeEquipment: boolean;
  /** Every element that changes the size, in the order found. */
  readonly origins: readonly Origin[];
}

export interface VitalsInPlay {
  /** Fast healing, then regeneration; at most one of each. */
  readonly recovery: readonly RecoveryInPlay[];
  /** Absent when no element gives temporary Hit Points. */
  readonly temporaryHitPoints?: TemporaryHitPointsInPlay;
  /** Absent when no element changes the size. */
  readonly size?: SizeInPlay;
}

/** What the elements are read against besides the rules and facts. */
export interface VitalsScope {
  readonly statistics: StatisticContent;
  readonly character: StatisticInputs;
  /** The size the character has before any element: its ancestry's. */
  readonly size: Size;
}

const SIZES: readonly Size[] = [Size.Tiny, Size.Small, Size.Medium, Size.Large, Size.Huge, Size.Gargantuan];

/** The reach a size gives a creature of normal build. */
const SIZE_REACH: Readonly<Record<Size, number>> = {
  [Size.Tiny]: 0,
  [Size.Small]: 5,
  [Size.Medium]: 5,
  [Size.Large]: 10,
  [Size.Huge]: 15,
  [Size.Gargantuan]: 20,
};

type Kind<Element extends RuleInPlay['element']> = RuleInPlay & { readonly element: Element };

/** The rules whose element `isKind` and whose predicate holds. */
function active<Element extends RuleInPlay['element']>(
  { rules, facts }: ModifierInputs,
  isKind: (element: RuleInPlay['element']) => element is Element,
): readonly Kind<Element>[] {
  return rules.filter(
    (rule): rule is Kind<Element> => isKind(rule.element) && truthOf(rule.element.predicate, facts) === Truth.True,
  );
}

const isFastHealing = (element: RuleInPlay['element']): element is FastHealingElement =>
  element.key === RuleElementKey.FastHealing;
const isTempHp = (element: RuleInPlay['element']): element is TempHPElement => element.key === RuleElementKey.TempHP;
const isCreatureSize = (element: RuleInPlay['element']): element is CreatureSizeElement =>
  element.key === RuleElementKey.CreatureSize;

/** `current` moved by `steps`, never below tiny, and never past `maximum` when growing. */
function stepped(current: Size, steps: SizeSteps, maximum: Size | undefined): Size {
  const from = SIZES.indexOf(current);
  const ceiling = maximum === undefined ? SIZES.length - 1 : Math.max(SIZES.indexOf(maximum), from);
  const to = steps < 0 ? Math.max(from + steps, 0) : Math.min(from + steps, ceiling);
  return SIZES[to] ?? current;
}

function reachOf(size: Size, reach: CreatureSizeElement['reach']): Feet {
  const given = SIZE_REACH[size];
  if (reach === undefined) {
    return Feet.parse(given);
  }
  return Feet.parse('override' in reach ? reach.override : given + reach.add);
}

interface Given {
  readonly amount: HitPoints;
  readonly origin: Origin;
  readonly deactivatedBy: readonly DamageType[];
}

/** The highest amount given, and every origin that gives it. */
interface Highest {
  readonly top: Given;
  readonly origins: readonly Origin[];
}

/** The highest of `given`, with the origin of every one that gives as much. */
function highest(given: readonly Given[]): Highest | undefined {
  let top = undefined as Given | undefined;
  for (const each of given) {
    if (top === undefined || each.amount > top.amount) {
      top = each;
    }
  }
  const amount = top?.amount;
  return top === undefined
    ? undefined
    : { top, origins: given.filter((each) => each.amount === amount).map(({ origin }) => origin) };
}

/** The amount, origin and deactivators a rule gives, none when its formula has no value or the value is below 1. */
function givenBy(rule: Kind<FastHealingElement | TempHPElement>, scope: VitalsScope, rules: ModifierInputs): Given[] {
  const deactivatedBy = rule.element.key === RuleElementKey.FastHealing ? (rule.element.deactivatedBy ?? []) : [];
  const source = { value: rule.element.value, origin: rule.origin, item: itemScopeOf(rule), deactivatedBy };
  return givenFrom(source, { scope, rules });
}

/** What an amount is read against: the character and the rules in play. */
interface VitalsReading {
  readonly scope: VitalsScope;
  readonly rules: ModifierInputs;
}

/** Where an amount comes from: its formula, what it is read against and the origin it is credited to. */
interface AmountSource {
  readonly value: ModifierValue | RuleValue;
  readonly origin: Origin;
  readonly item: ItemScope;
  readonly deactivatedBy: readonly DamageType[];
}

function givenFrom({ value, origin, item, deactivatedBy }: AmountSource, { scope, rules }: VitalsReading): Given[] {
  const proficiency = proficiencyBonuses(scope.statistics.proficiencyBonus, {
    rules: rules.rules,
    facts: rules.facts,
    level: scope.character.level,
  });
  const resolve = resolverFor({ inputs: scope.character, proficiency }, (): undefined => undefined, { item });
  const outcome = valueOf(value, resolve);
  if (!outcome.ok || outcome.value < 1) {
    return [];
  }
  return [{ amount: HitPoints.parse(outcome.value), origin, deactivatedBy }];
}

/** The size after `resizes`, in order, with the reach the last element that names one gives. */
function resized(resizes: readonly Kind<CreatureSizeElement>[], base: Size, form: FormInPlay | undefined): SizeInPlay {
  let size = form?.form.size ?? base;
  let reach = undefined as CreatureSizeElement['reach'];
  for (const { element } of resizes) {
    size = typeof element.value === 'number' ? stepped(size, element.value, element.maximumSize) : element.value;
    reach = element.reach ?? reach;
  }
  return {
    size,
    base,
    reach: reachOf(size, reach),
    resizeEquipment: resizes.some(({ element }) => element.resizeEquipment === true),
    origins: [...(form?.form.size === undefined ? [] : [form.origin]), ...resizes.map(({ origin }) => origin)],
  };
}

/** The temporary Hit Points a battle form gives, credited to the form; none when it gives none or its formula has no value. */
function formTempHp(form: FormInPlay | undefined, reading: VitalsReading): Given[] {
  const value = form?.form.tempHP;
  return form === undefined || value === undefined
    ? []
    : givenFrom({ value, origin: form.origin, item: NO_ITEM, deactivatedBy: [] }, reading);
}

/**
 * What the character's `FastHealing`, `TempHP` and `CreatureSize` elements give. An element whose predicate fails or
 * depends on the situation gives nothing on the sheet, and one whose formula has no value, or a value below 1, is
 * ignored. Recovery and temporary Hit Points do not add up (Player Core): of each kind the highest counts, with every
 * element that gives it as an origin. Sizes apply in the order found, a named size setting it and a number of steps
 * moving it, never past the `maximumSize` it names; the reach is the last element's that names one, else the size's.
 * A battle form that names a size sets it first, and the elements then apply to that. A battle form’s temporary Hit Points
 * join the others, with the form as their origin.
 */
export function vitalsInPlay(inputs: ModifierInputs, scope: VitalsScope): VitalsInPlay {
  const healing = active(inputs, isFastHealing);
  const recovery = Object.values(FastHealingType).flatMap((type): RecoveryInPlay[] => {
    const found = highest(
      healing
        .filter(({ element }) => (element.type ?? FastHealingType.FastHealing) === type)
        .flatMap((rule) => givenBy(rule, scope, inputs)),
    );
    return found === undefined
      ? []
      : [{ type, amount: found.top.amount, deactivatedBy: found.top.deactivatedBy, origins: found.origins }];
  });
  const form = battleFormInPlay(inputs);
  const temp = highest([
    ...active(inputs, isTempHp).flatMap((rule) => givenBy(rule, scope, inputs)),
    ...formTempHp(form, { scope, rules: inputs }),
  ]);
  const resizes = active(inputs, isCreatureSize);
  return {
    recovery,
    ...(temp === undefined ? {} : { temporaryHitPoints: { amount: temp.top.amount, origins: temp.origins } }),
    ...(resizes.length === 0 && form?.form.size === undefined ? {} : { size: resized(resizes, scope.size, form) }),
  };
}
