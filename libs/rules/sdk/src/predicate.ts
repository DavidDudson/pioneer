import { issueParams, message } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { RulesMessage } from './messages';
import { RollOption } from './roll-option';

/** A number a comparison tests a numeric roll option against (`{ "gte": ["self:level", 5] }`). */
export const PredicateNumber = z.number().brand<'PredicateNumber'>();
export type PredicateNumber = z.infer<typeof PredicateNumber>;

/**
 * Foundry pf2e predicate syntax, unchanged so imported content needs no rewriting (ADR-0002).
 * This file is the shape only; evaluation (three-valued, Kleene) lives in the engine.
 */
export type PredicateStatement = RollOption | PredicateComparison | PredicateCompound;

/** Compares the numeric suffix of a roll option (`self:level:5`) with a number or another option. */
export type ComparisonOperands = readonly [RollOption, RollOption | PredicateNumber];

export type PredicateComparison =
  | { readonly eq: ComparisonOperands }
  | { readonly gt: ComparisonOperands }
  | { readonly gte: ComparisonOperands }
  | { readonly lt: ComparisonOperands }
  | { readonly lte: ComparisonOperands };

export type PredicateCompound =
  | { readonly and: readonly PredicateStatement[] }
  | { readonly or: readonly PredicateStatement[] }
  | { readonly xor: readonly PredicateStatement[] }
  | { readonly nand: readonly PredicateStatement[] }
  | { readonly nor: readonly PredicateStatement[] }
  | { readonly iff: readonly PredicateStatement[] }
  | { readonly not: PredicateStatement }
  | { readonly if: PredicateStatement; readonly then: PredicateStatement };

/** Every statement in an array must hold; an empty array always holds. */
export type Predicate = readonly PredicateStatement[];

/** Deepest JSON nesting a predicate may have (arrays and objects both count), so a parse can't exhaust the stack. */
export const PREDICATE_DEPTH_MAX = 32;

const Operands = z.tuple([RollOption, z.union([RollOption, PredicateNumber])]);

export const PredicateStatement: z.ZodType<PredicateStatement> = z.lazy(() => {
  const statements = z.array(PredicateStatement).min(1);
  return z.union([
    RollOption,
    z.strictObject({ eq: Operands }),
    z.strictObject({ gt: Operands }),
    z.strictObject({ gte: Operands }),
    z.strictObject({ lt: Operands }),
    z.strictObject({ lte: Operands }),
    z.strictObject({ and: statements }),
    z.strictObject({ or: statements }),
    z.strictObject({ xor: statements }),
    z.strictObject({ nand: statements }),
    z.strictObject({ nor: statements }),
    z.strictObject({ iff: statements }),
    z.strictObject({ not: PredicateStatement }),
    // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002); then is a statement, never a function
    z.strictObject({ if: PredicateStatement, then: PredicateStatement }),
  ]);
});

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

/** The arrays and objects directly inside an array or object. */
function innerContainers(value: object): readonly object[] {
  return Object.values(value).filter((child) => isContainer(child));
}

/** Breadth-first, level by level, so deeply nested input is measured without recursion. */
function tooDeep(value: unknown): boolean {
  let level: readonly object[] = isContainer(value) ? [value] : [];
  let depth = 0;
  while (level.length > 0) {
    depth += 1;
    if (depth > PREDICATE_DEPTH_MAX) {
      return true;
    }
    level = level.flatMap((node) => innerContainers(node));
  }
  return false;
}

/** A whole predicate: the statements that must all hold. Too-deep input is rejected before it is walked. */
export const Predicate: z.ZodType<Predicate> = z.preprocess((value, context) => {
  if (tooDeep(value)) {
    context.issues.push({
      code: 'custom',
      input: value,
      message: RulesMessage.PredicateTooDeep,
      ...issueParams(message(RulesMessage.PredicateTooDeep, { maximum: PREDICATE_DEPTH_MAX })),
    });
    return z.NEVER;
  }
  return value;
}, z.array(PredicateStatement));
