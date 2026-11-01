import { FormulaValue } from '@pioneer/rules/formula';
import { Truth } from '@pioneer/rules/predicate';
import { DamageProperty, DiceCount, RollOptionNamespace, RuleElementKey, RuleNumber } from '@pioneer/rules/sdk';
import type {
  DamageAlterationElement,
  DamageDiceCategory,
  DamageDiceElement,
  DamageType,
  DieSize,
  Origin,
  RuleValue,
} from '@pioneer/rules/sdk';

import type { StatisticContent } from './derive-statistics';
import { proficiencyBonuses } from './proficiency-bonuses';
import { itemScopeOf, ruleIdOf } from './rule-in-play';
import type { ModifierInputs, RuleId, RuleInPlay } from './rule-in-play';
import { changed, truthOf, valueOf } from './rule-value';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';
import { notedBy } from './strike-notes';
import type { StrikeNote } from './strike-notes';
import { ownsStrike, reaches } from './strike-targets';
import type { StrikeTargets } from './strike-targets';

export { NoteRoll } from './strike-notes';
export type { StrikeNote } from './strike-notes';
export { ETCHED_DAMAGE } from './strike-targets';
export type { StrikeTargets } from './strike-targets';

/** Dice a `DamageDice` element adds to a Strike's damage, on top of the weapon's. */
export interface ExtraDice {
  readonly count: DiceCount;
  readonly die: DieSize;
  readonly damageType: DamageType;
  /** `precision`, `persistent` or `splash`; undefined for ordinary damage. */
  readonly category: DamageDiceCategory | undefined;
  /** Rolled only on a critical hit. */
  readonly critical: boolean;
  /** The damage of its type ignores the target's resistance to it. */
  readonly ignoresResistance: boolean;
  readonly origin: Origin;
}

/** What a Strike's rule elements change about its dice, and the notes on its rolls. */
export interface StrikeRules {
  /** The weapon's dice after `DamageDice` and `DamageAlteration` elements change their number. */
  readonly dice: DiceCount;
  /** The weapon's damage type after elements override it. */
  readonly damageType: DamageType;
  readonly extra: readonly ExtraDice[];
  readonly notes: readonly StrikeNote[];
  /**
   * The elements that would change the Strike if their situation held (the target is undead) and that no roll has
   * claimed; the player can claim them for a roll (`ModifierInputs.situation`).
   */
  readonly conditional: readonly RuleId[];
}

/** What a Strike's rule elements are read against, besides the rules and their facts. */
export interface StrikeScope {
  readonly statistics: StatisticContent;
  readonly character: StatisticInputs;
}

/** Where a predicate reads a weapon's own roll options (`item:group:sword`). */
const ITEM_NAMESPACE = RollOptionNamespace.parse('item');

/** What a number of dice or an amount of change is read as: its value, or why it has none. */
type Reader = (rule: RuleInPlay, value: DiceCount | RuleValue) => RuleNumber | undefined;

function readerFor({ rules, facts }: ModifierInputs, { statistics, character }: StrikeScope): Reader {
  const proficiency = proficiencyBonuses(statistics.proficiencyBonus, { rules, facts, level: character.level });
  return (rule, value) => {
    if (typeof value === 'number') {
      return RuleNumber.parse(value);
    }
    const resolve = resolverFor({ inputs: character, proficiency }, (): undefined => undefined, {
      item: itemScopeOf(rule),
    });
    const outcome = valueOf(value, resolve);
    return outcome.ok ? outcome.value : undefined;
  };
}

function diceOf(read: Reader, rule: RuleInPlay, value: DiceCount | RuleValue): DiceCount | undefined {
  const given = read(rule, value);
  return given === undefined ? undefined : DiceCount.parse(Math.max(0, Math.floor(given)));
}

/** The dice and type of a weapon's damage, as elements change them. */
interface DiceAndType {
  readonly dice: DiceCount;
  readonly damageType: DamageType;
}

/** `current` as a `DamageAlteration` changes it; unchanged when its amount has no value or the result is out of range. */
function altered(
  current: DiceAndType,
  { element, rule }: { readonly element: DamageAlterationElement; readonly rule: RuleInPlay },
  read: Reader,
): DiceAndType {
  if (element.property === DamageProperty.DamageType) {
    return { ...current, damageType: element.value };
  }
  const amount = read(rule, element.value);
  const result =
    amount === undefined
      ? undefined
      : changed(element.mode, FormulaValue.parse(current.dice), RuleNumber.parse(amount));
  return result === undefined ? current : { ...current, dice: DiceCount.parse(Math.max(0, result)) };
}

/** The dice a `DamageDice` element adds of its own, when it names a die. */
function extraOf(
  { rule, element }: { readonly rule: RuleInPlay; readonly element: DamageDiceElement },
  damageType: DamageType,
  read: Reader,
): ExtraDice[] {
  if (element.dieSize === undefined) {
    return [];
  }
  const count = element.diceNumber === undefined ? DiceCount.parse(1) : diceOf(read, rule, element.diceNumber);
  return count === undefined
    ? []
    : [
        {
          count,
          die: element.dieSize,
          damageType: element.damageType ?? damageType,
          category: element.category,
          critical: element.critical === true,
          ignoresResistance: element.ignoreResistance === true,
          origin: rule.origin,
        },
      ];
}

/** A Strike's rules as far as read: its dice and type so far, the extra dice and the notes found. */
interface Reading extends DiceAndType {
  readonly extra: readonly ExtraDice[];
  readonly notes: readonly StrikeNote[];
  readonly conditional: readonly RuleId[];
}

/** `reading` after `rule`, which applies when its predicate holds and its selectors reach the Strike's rolls. */
function applied(
  reading: Reading,
  rule: RuleInPlay,
  using: { readonly targets: StrikeTargets; readonly read: Reader },
): Reading {
  const { element } = rule;
  const { targets } = using;
  const rolls = targets.die !== undefined;
  if (
    element.key === RuleElementKey.DamageDice &&
    reaches(element.selectors, targets.damage, ownsStrike(rule, targets))
  ) {
    const more = element.diceNumber === undefined ? undefined : diceOf(using.read, rule, element.diceNumber);
    const changes = rolls && element.dieSize === undefined;
    return {
      ...reading,
      dice: changes && more !== undefined ? DiceCount.parse(reading.dice + more) : reading.dice,
      damageType: changes ? (element.override?.damageType ?? reading.damageType) : reading.damageType,
      extra: [...reading.extra, ...extraOf({ rule, element }, reading.damageType, using.read)],
    };
  }
  if (
    element.key === RuleElementKey.DamageAlteration &&
    rolls &&
    reaches(element.selectors, targets.damage, ownsStrike(rule, targets))
  ) {
    return { ...reading, ...altered(reading, { element, rule }, using.read) };
  }
  return { ...reading, notes: notedBy(reading.notes, rule, targets) };
}

/** Whether `after` differs from `before` in what the Strike's rules give. */
function changedBy(before: Reading, after: Reading): boolean {
  return (
    after.dice !== before.dice ||
    after.damageType !== before.damageType ||
    after.extra.length !== before.extra.length ||
    after.notes.length !== before.notes.length
  );
}

/**
 * What the rule elements in play change about one Strike. An element whose predicate holds applies. One that depends
 * on the situation (the target is undead) applies when a roll has claimed it (`ModifierInputs.situation`); otherwise
 * it gives nothing, and is listed in `conditional` if it would have changed the Strike. `DamageDice` with a `dieSize` adds dice of its
 * own; without one it adds to the weapon's dice, or overrides their type. `DamageAlteration` changes the weapon's dice
 * number or type. Elements apply in the order found. A weapon with no die rolls flat damage, which neither changes. A
 * `Note` that reaches a roll comes back with it; a `CriticalSpecialization` gives the critical hit note of the group.
 */
export function strikeRules(inputs: ModifierInputs, scope: StrikeScope, targets: StrikeTargets): StrikeRules {
  const using = { targets, read: readerFor(inputs, scope) };
  const start: Reading = {
    dice: targets.dice,
    damageType: targets.damageType,
    extra: [],
    notes: [],
    conditional: [],
  };
  let reading = start;
  for (const rule of inputs.rules) {
    const facts =
      rule.element.key === RuleElementKey.CriticalSpecialization
        ? inputs.facts.withNamespace(ITEM_NAMESPACE, targets.rollOptions ?? [])
        : inputs.facts;
    const truth = truthOf(rule.element.predicate, facts);
    const claimed = truth === Truth.Unknown && inputs.situation?.has(ruleIdOf(rule)) === true;
    if (truth === Truth.True || claimed) {
      reading = applied(reading, rule, using);
    } else if (truth === Truth.Unknown) {
      const would = applied(reading, rule, using);
      reading = changedBy(reading, would)
        ? { ...reading, conditional: [...reading.conditional, ruleIdOf(rule)] }
        : reading;
    }
  }
  return reading;
}
