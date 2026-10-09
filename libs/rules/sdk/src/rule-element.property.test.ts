import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import { assert, jsonValue, property, string } from 'fast-check';
import { z } from 'zod';

import { RulesMessage } from './messages';
import { RuleElement, RuleElements } from './rule-element';
import { RuleElementKey } from './rule-element-base';
import { ruleElementJson } from './testing';

const KNOWN_KEYS: ReadonlySet<string> = new Set(Object.values(RuleElementKey));

describe('rule elements (properties)', () => {
  test('valid elements parse to themselves and encode back unchanged', () => {
    assert(
      property(ruleElementJson, (json) => {
        const parsed = RuleElement.parse(json);
        const asParsed: unknown = parsed;
        const encoded: unknown = z.encode(RuleElement, parsed);
        expect(asParsed).toStrictEqual(json);
        expect(encoded).toStrictEqual(json);
      }),
    );
  });

  test('an unknown key is rejected with a descriptor naming it', () => {
    assert(
      property(
        ruleElementJson,
        string().filter((key) => !KNOWN_KEYS.has(key)),
        (json, key) => {
          const result = RuleElement.safeParse({ ...json, key });
          expect(result.success ? [] : fieldIssues(result.error.issues)).toStrictEqual([
            { path: ['key'], message: message(RulesMessage.UnknownElement, { key }) },
          ]);
        },
      ),
    );
  });

  test('an extra field on any element is rejected', () => {
    assert(
      property(ruleElementJson, (json) => {
        expect(RuleElement.safeParse({ ...json, label: 'Extra' }).success).toBe(false);
      }),
    );
  });

  test('arbitrary JSON never throws', () => {
    assert(
      property(jsonValue(), (json) => {
        expect(() => RuleElement.safeParse(json)).not.toThrow();
        expect(() => RuleElements.safeParse(json)).not.toThrow();
      }),
    );
  });
});
