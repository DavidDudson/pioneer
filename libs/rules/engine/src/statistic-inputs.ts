import { FormulaValue } from '@pioneer/rules/formula';
import type { ResolveReference } from '@pioneer/rules/formula';
import {
  Attribute,
  AttributeModifier,
  AttributeModifiers,
  AttributeSchema,
  Feet,
  HitPoints,
  knownReference,
  Level,
  Proficiency,
  ProficiencySchema,
  ReferenceKind,
  Selector,
} from '@pioneer/rules/sdk';
import type { KnownReference } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { EngineMessage } from './messages';
import type { ProficiencyBonuses } from './proficiency-bonuses';

/** What the character's ancestry gives its statistics: `@ancestry.hp` and `@ancestry.speed`. */
interface AncestryInputs {
  readonly hitPoints: HitPoints;
  readonly speed: Feet;
}

/** What the character's class gives its statistics: `@class.hp`, and the key attribute `@attr.key` reads. */
interface ClassInputs {
  /** Hit Points each level, before Constitution. */
  readonly hitPoints: HitPoints;
  /** The key attribute chosen for the class, from the ones it allows. */
  readonly keyAttribute: Attribute;
}

/**
 * What the statistic graph reads besides the statistics themselves: the character's level, attribute modifiers,
 * proficiency ranks, armor Dexterity cap, and what its ancestry and class give. Grant resolution (Epic 1.4) will
 * produce these; for now they are supplied directly.
 */
export interface StatisticInputs {
  readonly level: Level;
  readonly attributes: AttributeModifiers;
  /** Rank per statistic or proficiency selector (`ac`, `attack:martial`); a selector left out is untrained. */
  readonly ranks: ReadonlyMap<Selector, Proficiency>;
  /** The Dexterity cap of worn armor; without one, `@attr.dex.capped` is the Dexterity modifier. */
  readonly dexterityCap?: AttributeModifier;
  /** Absent until an ancestry is chosen; a formula reading it then fails at that reference. */
  readonly ancestry?: AncestryInputs;
  /** Absent until a class is chosen; a formula reading it then fails at that reference. */
  readonly class?: ClassInputs;
}

const AncestryInputsJson = z.strictObject({ hitPoints: HitPoints, speed: Feet });
const ClassInputsJson = z.strictObject({ hitPoints: HitPoints, keyAttribute: AttributeSchema });

/** The inputs as JSON, with ranks as an object keyed by selector, decoded into `StatisticInputs`. */
export const StatisticInputsJson = z
  .strictObject({
    level: Level,
    attributes: AttributeModifiers.codec,
    ranks: z.record(Selector, ProficiencySchema),
    dexterityCap: AttributeModifier.optional(),
    ancestry: AncestryInputsJson.optional(),
    class: ClassInputsJson.optional(),
  })
  .transform(({ ranks, dexterityCap, ancestry, class: characterClass, ...rest }): StatisticInputs => ({
    ...rest,
    ranks: new Map(Object.entries(ranks).map(([selector, rank]) => [Selector.parse(selector), rank])),
    ...(dexterityCap === undefined ? {} : { dexterityCap }),
    ...(ancestry === undefined ? {} : { ancestry }),
    ...(characterClass === undefined ? {} : { class: characterClass }),
  }));

/** The order of ranks, so `@rank.<selector>` reads 0 for untrained to 4 for legendary. */
const RANK_ORDER: readonly Proficiency[] = Object.values(Proficiency);

function rankOf(inputs: StatisticInputs, selector: Selector): Proficiency {
  return inputs.ranks.get(selector) ?? Proficiency.Untrained;
}

function cappedDexterity(inputs: StatisticInputs): FormulaValue {
  const dexterity = inputs.attributes.get(Attribute.Dexterity);
  const cap = inputs.dexterityCap ?? dexterity;
  return FormulaValue.parse(Math.min(dexterity, cap));
}

/** The value an input reference reads; undefined for statistic and item references, which inputs do not hold. */
function inputValue(
  reference: KnownReference,
  inputs: StatisticInputs,
  { bonuses }: ProficiencyBonuses,
): FormulaValue | undefined {
  switch (reference.kind) {
    case ReferenceKind.Level: {
      return FormulaValue.parse(inputs.level);
    }
    case ReferenceKind.AttributeModifier: {
      return FormulaValue.parse(inputs.attributes.get(reference.attribute));
    }
    case ReferenceKind.CappedDexterity: {
      return cappedDexterity(inputs);
    }
    case ReferenceKind.KeyAttributeModifier: {
      return inputs.class === undefined
        ? undefined
        : FormulaValue.parse(inputs.attributes.get(inputs.class.keyAttribute));
    }
    case ReferenceKind.AncestryHitPoints: {
      return inputs.ancestry === undefined ? undefined : FormulaValue.parse(inputs.ancestry.hitPoints);
    }
    case ReferenceKind.AncestrySpeed: {
      return inputs.ancestry === undefined ? undefined : FormulaValue.parse(inputs.ancestry.speed);
    }
    case ReferenceKind.ClassHitPoints: {
      return inputs.class === undefined ? undefined : FormulaValue.parse(inputs.class.hitPoints);
    }
    case ReferenceKind.ProficiencyBonus: {
      return bonuses.get(rankOf(inputs, reference.selector));
    }
    case ReferenceKind.ProficiencyRank: {
      return FormulaValue.parse(RANK_ORDER.indexOf(rankOf(inputs, reference.selector)));
    }
    case ReferenceKind.Statistic:
    case ReferenceKind.ItemLevel: {
      return undefined;
    }
    default: {
      return reference satisfies never;
    }
  }
}

/** Why a reference has no value: the character has no ancestry, or no class, yet. */
export type MissingInput = typeof EngineMessage.NoAncestry | typeof EngineMessage.NoClass;

/** What `reference` reads that the character has not chosen yet, or undefined when its value is there. */
export function missingInput(reference: KnownReference, inputs: StatisticInputs): MissingInput | undefined {
  switch (reference.kind) {
    case ReferenceKind.AncestryHitPoints:
    case ReferenceKind.AncestrySpeed: {
      return inputs.ancestry === undefined ? EngineMessage.NoAncestry : undefined;
    }
    case ReferenceKind.KeyAttributeModifier:
    case ReferenceKind.ClassHitPoints: {
      return inputs.class === undefined ? EngineMessage.NoClass : undefined;
    }
    case ReferenceKind.Level:
    case ReferenceKind.AttributeModifier:
    case ReferenceKind.CappedDexterity:
    case ReferenceKind.ProficiencyBonus:
    case ReferenceKind.ProficiencyRank:
    case ReferenceKind.Statistic:
    case ReferenceKind.ItemLevel: {
      return undefined;
    }
    default: {
      return reference satisfies never;
    }
  }
}

/** Reads a statistic's value by selector, or undefined when it has none. */
export type StatisticValues = (selector: Selector) => FormulaValue | undefined;

/** What a resolver reads besides statistics: the character's inputs and the proficiency bonuses in force. */
export interface CharacterValues {
  readonly inputs: StatisticInputs;
  readonly proficiency: ProficiencyBonuses;
}

/**
 * Resolves a formula's references from the inputs, `@prof.<selector>` from the proficiency bonuses in force,
 * `@stat.<selector>` from `statistics`, and `@item.level` from `itemLevel`: the level of the item a rule element is
 * on, which a statistic's base formula never has.
 */
export function resolverFor(
  { inputs, proficiency }: CharacterValues,
  statistics: StatisticValues,
  itemLevel?: Level,
): ResolveReference {
  return (path) => {
    const reference = knownReference(path);
    if (reference === undefined) {
      return undefined;
    }
    if (reference.kind === ReferenceKind.Statistic) {
      return statistics(reference.selector);
    }
    if (reference.kind === ReferenceKind.ItemLevel) {
      return itemLevel === undefined ? undefined : FormulaValue.parse(itemLevel);
    }
    return inputValue(reference, inputs, proficiency);
  };
}
