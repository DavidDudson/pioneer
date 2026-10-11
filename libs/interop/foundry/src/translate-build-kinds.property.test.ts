import { describe, expect, test } from 'bun:test';

import { KIND_DATA, RuleElement } from '@pioneer/rules/sdk';
import { anything, assert, constantFrom, dictionary, property, string } from 'fast-check';

import { translate } from './testing/import-fixtures';

const FIELD_LENGTH_MAX = 24;

/** The build types, each with a `system` of arbitrary fields: what a Foundry release Pioneer has never seen may hold. */
const TYPES = ['ancestry', 'heritage', 'background', 'class', 'feat', 'deity', 'kit'] as const;
const systems = dictionary(string({ maxLength: FIELD_LENGTH_MAX }), anything());

describe('translateKindData on build kinds', () => {
  test('never throws; data parses against its kind, added rules are rule elements, or a gap says why', () => {
    assert(
      property(constantFrom(...TYPES), systems, (type, system) => {
        const translation = translate([{ id: 'aNyDoCuMeNt00001', name: 'Any Name', type, system }]);
        const [entry] = translation.entries;
        const data = entry?.kindData;

        expect(data === undefined || KIND_DATA[data.kind].safeParse(data.data).success).toBe(true);
        expect(entry?.envelope.rules.every((rule) => RuleElement.safeParse(rule).success)).not.toBe(false);
        expect(data !== undefined || translation.kindDataGaps.length > 0).toBe(true);
      }),
    );
  });
});
