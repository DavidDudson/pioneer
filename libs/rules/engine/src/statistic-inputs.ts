import { FormulaValue } from '@pioneer/rules/formula';
import type { ResolveReference } from '@pioneer/rules/formula';
import {
  Attribute,
  AttributeModifier,
  AttributeModifiers,
  knownReference,
  Level,
  Proficiency,
  proficiencyBonus,
  ProficiencySchema,
  ReferenceKind,
  Selector,
} from '@pioneer/rules/sdk';
import type { KnownReference } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * What the statistic graph reads besides the statistics themselves: the character's level, attribute modifiers,
 * proficiency ranks and armor Dexterity cap. Grant resolution (Epic 1.4) will produce these; for now they are
 * supplied directly.
 */
export interface StatisticInputs {
  readonly level: Level;
  readonly attributes: AttributeModifiers;
  /** Rank per statistic or proficiency selector (`ac`, `attack:martial`); a selector left out is untrained. */
  readonly ranks: ReadonlyMap<Selector, Proficiency>;
  /** The Dexterity cap of worn armor; without one, `@attr.dex.capped` is the Dexterity modifier. */
  readonly dexterityCap?: AttributeModifier;
}

/** The inputs as JSON, with ranks as an object keyed by selector, decoded into `StatisticInputs`. */
export const StatisticInputsJson = z
  .strictObject({
    level: Level,
    attributes: AttributeModifiers.codec,
    ranks: z.record(Selector, ProficiencySchema),
    dexterityCap: AttributeModifier.optional(),
  })
  .transform(({ ranks, dexterityCap, ...rest }): StatisticInputs => ({
    ...rest,
    ranks: new Map(Object.entries(ranks).map(([selector, rank]) => [Selector.parse(selector), rank])),
    ...(dexterityCap === undefined ? {} : { dexterityCap }),
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
function inputValue(reference: KnownReference, inputs: StatisticInputs): FormulaValue | undefined {
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
    case ReferenceKind.ProficiencyBonus: {
      return FormulaValue.parse(proficiencyBonus(rankOf(inputs, reference.selector), inputs.level));
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

/** Reads a statistic's value by selector, or undefined when it has none. */
export type StatisticValues = (selector: Selector) => FormulaValue | undefined;

/**
 * Resolves a formula's references from the inputs, `@stat.<selector>` from `statistics`, and `@item.level` from
 * `itemLevel`: the level of the item a rule element is on, which a statistic's base formula never has.
 */
export function resolverFor(inputs: StatisticInputs, statistics: StatisticValues, itemLevel?: Level): ResolveReference {
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
    return inputValue(reference, inputs);
  };
}
