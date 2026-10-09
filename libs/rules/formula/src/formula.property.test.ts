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
/** The second half of an emoji or other astral character. */
const LOW_SURROGATE = /^[\uDC00-\uDFFF]$/u;

/** Parsing never throws; a failure points inside the text or one past it, never into the middle of an emoji. */
function expectErrorInBounds(raw: string): void {
  const text = FormulaText.parse(raw);
  const outcome = parseFormula(text);
  const position = outcome.ok ? 1 : outcome.position;
  const unit = text.slice(position - 1, position);
  expect(position).toBeGreaterThanOrEqual(1);
  expect(position).toBeLessThanOrEqual(text.length + 1);
  expect(LOW_SURROGATE.test(unit)).toBe(false);
}

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

  test('parsing any text never throws, and errors point at the start of a character or just past the end', () => {
    assert(property(string({ unit: 'binary', maxLength: 60 }), expectErrorInBounds));
  });

  test('formula-shaped noise gets the same guarantees', () => {
    assert(property(string({ unit: formulaChar, maxLength: 40 }), expectErrorInBounds));
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
