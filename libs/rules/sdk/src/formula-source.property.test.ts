import { describe, expect, test } from 'bun:test';

import { FormulaMessage, ReferencePath } from '@pioneer/rules/formula';
import { fieldIssues } from '@pioneer/shared/kernel';
import { assert, constantFrom, oneof, property } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { knownReference } from './formula-reference';
import { RulesMessage } from './messages';
import { RuleElement } from './rule-element';
import { knownReferencePath, ruleElementJson, unknownReferencePath, validFormulaText } from './testing';

/** Elements whose `value` is a formula field: they take a formula there. */
const withFormulaValue: Arbitrary<object> = ruleElementJson.filter(
  (json) => 'value' in json && RuleElement.safeParse({ ...json, value: '@level' }).success,
);

/** Room left for ` + @path` under the length limit, so an added reference is never reported as too long. */
const SHORT_FORMULA_MAX = 400;
const shortFormulaText = validFormulaText.filter((text) => text.length <= SHORT_FORMULA_MAX);

/** Valid formula text spoiled so it no longer parses. */
const badSyntax: Arbitrary<string> = oneof(
  validFormulaText.map((text) => `${text} +`),
  validFormulaText.map((text) => `(${text}`),
  validFormulaText.map((text) => `${text} $`),
  constantFrom('', 'max()', '@', '1 2'),
);

const REFERENCE_KEYS: ReadonlySet<string> = new Set([RulesMessage.UnknownReference, RulesMessage.FoundryReference]);
const PARSE_KEYS: ReadonlySet<string> = new Set(Object.values(FormulaMessage));

describe('formula fields (properties)', () => {
  test('every known path is known, and every unknown path is not', () => {
    assert(
      property(knownReferencePath, unknownReferencePath, (known, unknown) => {
        expect(knownReference(ReferencePath.parse(known))).toBeDefined();
        expect(knownReference(ReferencePath.parse(unknown))).toBeUndefined();
      }),
    );
  });

  test('an unknown reference in any formula field is rejected at that field, with its position', () => {
    assert(
      property(withFormulaValue, shortFormulaText, unknownReferencePath, (json, text, path) => {
        const value = `${text} + @${path}`;
        const result = RuleElement.safeParse({ ...json, value });
        const issues = result.success ? [] : fieldIssues(result.error.issues);
        expect(issues.length).toBeGreaterThan(0);
        for (const issue of issues) {
          expect(issue.path).toStrictEqual(['value']);
          expect(issue.message.params?.['position']).toBeNumber();
        }
        expect(issues.some((issue) => REFERENCE_KEYS.has(issue.message.key))).toBe(true);
      }),
    );
  });

  test('bad syntax in any formula field is rejected at that field, with its position', () => {
    assert(
      property(withFormulaValue, badSyntax, (json, value) => {
        const result = RuleElement.safeParse({ ...json, value });
        const issues = result.success ? [] : fieldIssues(result.error.issues);
        expect(issues).toHaveLength(1);
        const [issue] = issues;
        expect(issue?.path).toStrictEqual(['value']);
        expect(PARSE_KEYS.has(issue?.message.key ?? '')).toBe(true);
        expect(issue?.message.params?.['position']).toBeNumber();
      }),
    );
  });
});
