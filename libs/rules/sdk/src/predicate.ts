import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { exceededBound, JsonSize } from './json-bounds';
import type { JsonBounds } from './json-bounds';
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

/**
 * One statement, unguarded. Private: every exported schema runs `depthGuarded` first, because this
 * recursion has no limit of its own.
 */
const Statement: z.ZodType<PredicateStatement> = z.lazy(() => {
  const statements = z.array(Statement).min(1);
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
    z.strictObject({ not: Statement }),
    // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002); then is a statement, never a function
    z.strictObject({ if: Statement, then: Statement }),
  ]);
});

/** Only depth matters for a predicate; the content it sits in bounds its size. */
const PREDICATE_BOUNDS: JsonBounds = {
  depth: JsonSize.parse(PREDICATE_DEPTH_MAX),
  containers: JsonSize.parse(Number.MAX_SAFE_INTEGER),
};

/**
 * Rejects too-deep input before `schema` walks it, so untrusted JSON cannot exhaust the stack. A
 * check piped into the schema, not a preprocess, so the result still encodes (`z.encode`).
 */
function depthGuarded<TOutput>(schema: z.ZodType<TOutput>): z.ZodType<TOutput> {
  const tooDeepMessage = message(RulesMessage.PredicateTooDeep, { maximum: PREDICATE_DEPTH_MAX });
  return z
    .unknown()
    .refine((value) => exceededBound(value, PREDICATE_BOUNDS) === undefined, {
      ...issueParams(tooDeepMessage),
      abort: true,
    })
    .pipe(schema);
}

/** One statement on its own, as a rule element's nested condition might hold it. */
export const PredicateStatement: z.ZodType<PredicateStatement> = depthGuarded(Statement);

/** A whole predicate: the statements that must all hold. */
export const Predicate: z.ZodType<Predicate> = depthGuarded(z.array(Statement));

/** Whether a statement is a numeric or text comparison (`eq`, `gt`, `gte`, `lt`, `lte`) rather than an option or compound. */
export function isPredicateComparison(statement: PredicateStatement): statement is PredicateComparison {
  return (
    typeof statement !== 'string' &&
    ('eq' in statement || 'gt' in statement || 'gte' in statement || 'lt' in statement || 'lte' in statement)
  );
}
