import { describe, expect, test } from 'bun:test';

import { assert, constantFrom, property, string } from 'fast-check';

import { FormulaMessage } from './messages';
import { parseFormula } from './parse';
import { printFormula } from './print';
import { references } from './references';
import { formula, withoutPositions } from './testing/arbitraries';
import { FormulaText } from './units';

/** Generated trees can be too long, deep or big to type; those limits are tested apart. */
const LIMITS = new Set<string>([FormulaMessage.TooLong, FormulaMessage.TooDeep, FormulaMessage.TooManyNodes]);
const formulaChar = constantFrom('0', '1', '9', '@', 'a', 'x', '.', '_', '-', '+', '*', '/', '(', ')', ',', ' ');

describe('formula (properties)', () => {
  test('print then parse gives the same tree back', () => {
    assert(
      property(formula, (original) => {
        const text = printFormula(original);
        const outcome = parseFormula(text);
        if (outcome.ok) {
          expect(withoutPositions(outcome.formula)).toEqual(withoutPositions(original));
          expect(printFormula(outcome.formula)).toBe(text);
        } else {
          expect(LIMITS.has(outcome.error.key)).toBe(true);
        }
      }),
    );
  });

  test('parsing never throws, and every error points inside the text or just past it', () => {
    assert(
      property(string({ maxLength: 60 }), (raw) => {
        const text = FormulaText.parse(raw);
        const outcome = parseFormula(text);
        if (!outcome.ok) {
          expect(outcome.position).toBeGreaterThanOrEqual(1);
          expect(outcome.position).toBeLessThanOrEqual(Math.max(text.length, 1) + 1);
        }
      }),
    );
  });

  test('formula-shaped noise never throws either', () => {
    assert(
      property(string({ unit: formulaChar, maxLength: 40 }), (raw) => {
        const outcome = parseFormula(FormulaText.parse(raw));
        expect(typeof outcome.ok).toBe('boolean');
      }),
    );
  });

  test('references lists every reference in the printed text, positions included', () => {
    assert(
      property(formula, (original) => {
        const text = printFormula(original);
        const outcome = parseFormula(text);
        if (outcome.ok) {
          for (const found of references(outcome.formula)) {
            expect(text.slice(found.position - 1, found.position + found.path.length)).toBe(`@${found.path}`);
          }
          expect(references(outcome.formula)).toHaveLength(text.split('@').length - 1);
        }
      }),
    );
  });
});
