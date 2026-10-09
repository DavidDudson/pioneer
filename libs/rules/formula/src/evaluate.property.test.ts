import { describe, expect, test } from 'bun:test';

import { assert, integer, property, record } from 'fast-check';

import { NodeKind } from './ast';
import type { FormulaNode } from './ast';
import { evaluate } from './evaluate';
import type { EvaluateOutcome, ResolveReference } from './evaluate';
import { FormulaFunction } from './functions';
import { FormulaMessage } from './messages';
import { references } from './references';
import { allBindings, bindings, evaluableFormula, formula, positions, reparsed } from './testing/arbitraries';
import { foundryValue } from './testing/foundry';
import type { Bindings } from './testing/foundry';
import { FormulaNumber, TextPosition } from './units';
import type { ReferencePath } from './units';

const resolverFor =
  (values: Bindings): ResolveReference =>
  (path) =>
    values.get(path);

/** Failures the reference implementation has no counterpart for: JavaScript gives `Infinity` or `NaN` instead. */
const ARITHMETIC_FAILURES = new Set<string>([FormulaMessage.DivisionByZero, FormulaMessage.OutOfRange]);

const CONDITION_MAX = 9;
/** A ternary with a non-zero number as its condition. */
const ternaryCase = record({
  condition: integer({ min: 1, max: CONDITION_MAX }),
  taken: evaluableFormula,
  other: formula,
  values: allBindings,
});

describe('evaluate (properties)', () => {
  test('agrees with Foundry evaluating the same formula as JavaScript', () => {
    assert(
      property(evaluableFormula, allBindings, (tree, values) => {
        const outcome = evaluate(tree, resolverFor(values));
        if (outcome.ok) {
          expect(outcome.value).toBe(foundryValue(tree, values));
        } else {
          expect(ARITHMETIC_FAILURES.has(outcome.error.key)).toBe(true);
        }
      }),
    );
  });

  test('never throws, and a failure points at a node of the formula', () => {
    assert(
      property(formula, bindings, (generated, values) => {
        const tree = reparsed(generated);
        if (tree === undefined) {
          return;
        }
        const outcome = evaluate(tree, resolverFor(values));
        if (!outcome.ok) {
          expect(positions(tree).has(outcome.position)).toBe(true);
        }
      }),
    );
  });

  test('is deterministic and only asks for references the formula has', () => {
    assert(
      property(evaluableFormula, bindings, (tree, values) => {
        const asked: ReferencePath[][] = [[], []];
        const outcomes: EvaluateOutcome[] = asked.map((log) =>
          evaluate(tree, (path) => {
            log.push(path);
            return values.get(path);
          }),
        );
        expect(outcomes[1]).toEqual(outcomes[0]);
        expect(asked[1]).toEqual(asked[0]);
        const known = new Set(references(tree).map((found) => found.path));
        expect(asked[0]?.every((path) => known.has(path))).toBe(true);
      }),
    );
  });

  test('fails on an unknown reference only when one is reached unbound', () => {
    assert(
      property(evaluableFormula, bindings, (generated, values) => {
        const tree = reparsed(generated);
        if (tree === undefined) {
          return;
        }
        const outcome = evaluate(tree, resolverFor(values));
        const unbound = references(tree).filter((found) => !values.has(found.path));
        if (!outcome.ok && outcome.error.key === FormulaMessage.UnknownReference) {
          expect(unbound.some((found) => found.position === outcome.position)).toBe(true);
        }
        if (unbound.length === 0) {
          expect(outcome.ok || outcome.error.key !== FormulaMessage.UnknownReference).toBe(true);
        }
      }),
    );
  });

  test('ternary with a non-zero condition is its second argument, whatever the third', () => {
    assert(
      property(ternaryCase, ({ condition, taken, other, values }) => {
        const at = TextPosition.parse(1);
        const ternary: FormulaNode = {
          kind: NodeKind.Call,
          name: FormulaFunction.Ternary,
          args: [{ kind: NodeKind.Number, value: FormulaNumber.parse(condition), position: at }, taken, other],
          position: at,
        };
        const resolve = resolverFor(values);
        expect(evaluate(ternary, resolve)).toEqual(evaluate(taken, resolve));
      }),
    );
  });
});
