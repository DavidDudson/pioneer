import { FormulaValue } from '@pioneer/rules/formula';
import { Truth } from '@pioneer/rules/predicate';
import {
  criticalSpecializationOf,
  DamageProperty,
  DegreeOfSuccess,
  DiceCount,
  Domain,
  OriginHopKind,
  RollOptionNamespace,
  RuleElementKey,
  RuleNumber,
} from '@pioneer/rules/sdk';
import type {
  ContentText,
  DamageAlterationElement,
  DamageDiceCategory,
  DamageDiceElement,
  DamageType,
  DieSize,
  InventoryItemId,
  ModifierTarget,
  NoteElement,
  Origin,
  RichText,
  RollOptionTail,
  RuleValue,
  WeaponGroup,
} from '@pioneer/rules/sdk';

import type { StatisticContent } from './derive-statistics';
import { proficiencyBonuses } from './proficiency-bonuses';
import { itemScopeOf } from './rule-in-play';
import type { ModifierInputs, RuleInPlay } from './rule-in-play';
import { changed, truthOf, valueOf } from './rule-value';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

/** Dice a `DamageDice` element adds to a Strike's damage, on top of the weapon's. */
export interface ExtraDice {
  readonly count: DiceCount;
  readonly die: DieSize;
  readonly damageType: DamageType;
  /** `precision`, `persistent` or `splash`; undefined for ordinary damage. */
  readonly category: DamageDiceCategory | undefined;
  /** Rolled only on a critical hit. */
  readonly critical: boolean;
  readonly origin: Origin;
}

/** Which of a Strike's rolls a note is for. */
export const NoteRoll = { Attack: 'attack', Damage: 'damage' } as const;
export type NoteRoll = (typeof NoteRoll)[keyof typeof NoteRoll];

/** A `Note` element that reaches a Strike's attack or damage roll. */
export interface StrikeNote {
  readonly roll: NoteRoll;
  readonly title: ContentText | undefined;
  readonly text: RichText;
  /** The degrees of success it shows on; undefined for all of them. */
  readonly outcome: readonly DegreeOfSuccess[] | undefined;
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
}

/** What a Strike's rule elements are read against, besides the rules and their facts. */
export interface StrikeScope {
  readonly statistics: StatisticContent;
  readonly character: StatisticInputs;
}

/** The weapon a Strike's rule elements are read for: its dice and type, and the selectors of its two rolls. */
export interface StrikeTargets {
  readonly dice: DiceCount;
  readonly die: DieSize | undefined;
  readonly damageType: DamageType;
  /** The weapon's origin, which says what inventory item it is (`ETCHED_DAMAGE`). */
  readonly origin?: Origin | undefined;
  /** The weapon's group and its own roll options, which a `CriticalSpecialization` element reads. */
  readonly group?: WeaponGroup | undefined;
  readonly rollOptions?: readonly RollOptionTail[] | undefined;
  /** The selectors and domains of the Strike's attack roll. */
  readonly attack: ReadonlySet<ModifierTarget>;
  /** The selectors and domains of the Strike's damage roll. */
  readonly damage: ReadonlySet<ModifierTarget>;
}

/** Where a predicate reads a weapon's own roll options (`item:group:sword`). */
const ITEM_NAMESPACE = RollOptionNamespace.parse('item');

/** The domain every roll belongs to. */
const ALL = Domain.parse('all');

/**
 * The damage roll of the weapon an element's item is etched on: a property rune's elements aim at the weapon it is
 * etched on, not at every Strike the character has. An element that names it reaches a Strike only when it comes from
 * the same inventory item as the Strike's weapon.
 */
export const ETCHED_DAMAGE = Domain.parse('etched-damage');

/** The inventory item an origin starts at, when it starts at one. */
function inventoryItemOf(origin: Origin | undefined): InventoryItemId | undefined {
  const [hop] = origin?.hops ?? [];
  return hop?.kind === OriginHopKind.Inventory ? hop.item : undefined;
}

/** Whether the rule comes from the inventory item the Strike's weapon is. */
function ownsStrike(rule: RuleInPlay, { origin }: StrikeTargets): boolean {
  const item = inventoryItemOf(rule.origin);
  return item !== undefined && item === inventoryItemOf(origin);
}

/** Whether `targets` reach one of `reached`; `etched` says whether the element comes from the Strike's own item. */
function reaches(targets: readonly ModifierTarget[], reached: ReadonlySet<ModifierTarget>, etched: boolean): boolean {
  return reached.has(ALL) || targets.some((target) => (target === ETCHED_DAMAGE ? etched : reached.has(target)));
}

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

/** The notes of one `Note` element, for each of the Strike's rolls it reaches. */
function notesOf(rule: RuleInPlay, element: NoteElement, targets: StrikeTargets): StrikeNote[] {
  const { selectors, title, text, outcome } = element;
  const note = { title, text, outcome, origin: rule.origin };
  return [
    ...(reaches(selectors, targets.attack, false) ? [{ ...note, roll: NoteRoll.Attack }] : []),
    ...(reaches(selectors, targets.damage, ownsStrike(rule, targets)) ? [{ ...note, roll: NoteRoll.Damage }] : []),
  ];
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
          origin: rule.origin,
        },
      ];
}

/** `notes` with the critical specialization of the Strike's weapon group, unless it has a group without one or already has it. */
function withCriticalSpecialization(
  notes: readonly StrikeNote[],
  rule: RuleInPlay,
  { group }: StrikeTargets,
): readonly StrikeNote[] {
  if (group === undefined) {
    return notes;
  }
  const text = criticalSpecializationOf(group);
  return notes.some((note) => note.outcome !== undefined && JSON.stringify(note.text) === JSON.stringify(text))
    ? notes
    : [
        ...notes,
        {
          roll: NoteRoll.Damage,
          title: undefined,
          text,
          outcome: [DegreeOfSuccess.CriticalSuccess],
          origin: rule.origin,
        },
      ];
}

/** `notes` with what `rule` adds to them: the notes of a `Note` element, or a group's critical specialization. */
function notedBy(notes: readonly StrikeNote[], rule: RuleInPlay, targets: StrikeTargets): readonly StrikeNote[] {
  const { element } = rule;
  if (element.key === RuleElementKey.Note) {
    return [...notes, ...notesOf(rule, element, targets)];
  }
  return element.key === RuleElementKey.CriticalSpecialization
    ? withCriticalSpecialization(notes, rule, targets)
    : notes;
}

/** A Strike's rules as far as read: its dice and type so far, the extra dice and the notes found. */
interface Reading extends DiceAndType {
  readonly extra: readonly ExtraDice[];
  readonly notes: readonly StrikeNote[];
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

/**
 * What the rule elements in play change about one Strike. Only an element whose predicate holds applies; one that
 * depends on the situation (the target is undead) gives nothing here. `DamageDice` with a `dieSize` adds dice of its
 * own; without one it adds to the weapon's dice, or overrides their type. `DamageAlteration` changes the weapon's dice
 * number or type. Elements apply in the order found. A weapon with no die rolls flat damage, which neither changes. A
 * `Note` that reaches a roll comes back with it; a `CriticalSpecialization` gives the critical hit note of the group.
 */
export function strikeRules(inputs: ModifierInputs, scope: StrikeScope, targets: StrikeTargets): StrikeRules {
  const using = { targets, read: readerFor(inputs, scope) };
  const start: Reading = { dice: targets.dice, damageType: targets.damageType, extra: [], notes: [] };
  let reading = start;
  for (const rule of inputs.rules) {
    const facts =
      rule.element.key === RuleElementKey.CriticalSpecialization
        ? inputs.facts.withNamespace(ITEM_NAMESPACE, targets.rollOptions ?? [])
        : inputs.facts;
    if (truthOf(rule.element.predicate, facts) === Truth.True) {
      reading = applied(reading, rule, using);
    }
  }
  return reading;
}
