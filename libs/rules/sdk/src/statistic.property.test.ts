import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import { assert, constantFrom, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';
import * as z from 'zod';

import { Attribute } from './attribute';
import { RulesMessage } from './messages';
import { StatisticDefinition, StatisticKind } from './statistic';
import { actorFormulaText, itemReferencePath, keyPathText } from './testing';

/** Room left for ` + @item.level` under the formula length limit. */
const SHORT_FORMULA_MAX = 400;

const statisticJson: Arbitrary<z.input<typeof StatisticDefinition>> = record(
  {
    slug: constantFrom('armor-class', 'perception', 'sanity'),
    name: constantFrom('Armor Class', 'Perception', 'Sanity'),
    selector: keyPathText,
    domains: keyPathText.map((domain) => [domain]),
    base: actorFormulaText,
    kind: constantFrom(...Object.values(StatisticKind)),
    keyAttribute: constantFrom(...Object.values(Attribute)),
  },
  { requiredKeys: ['slug', 'name', 'selector', 'domains', 'base', 'kind'] },
);

describe('statistic definitions (properties)', () => {
  test('a definition with an actor-only base formula round-trips', () => {
    assert(
      property(statisticJson, (json) => {
        const parsed = StatisticDefinition.parse(json);
        expect(StatisticDefinition.parse(z.encode(StatisticDefinition, parsed))).toStrictEqual(parsed);
      }),
    );
  });

  test('any item reference in the base formula is rejected at base, with its position', () => {
    assert(
      property(
        statisticJson.filter((json) => json.base.length <= SHORT_FORMULA_MAX),
        itemReferencePath,
        (json, path) => {
          const result = StatisticDefinition.safeParse({ ...json, base: `${json.base} + @${path}` });
          const issues = result.success ? [] : fieldIssues(result.error.issues);
          expect(issues).toHaveLength(1);
          expect(issues[0]?.path).toStrictEqual(['base']);
          expect(issues[0]?.message.key).toBe(RulesMessage.ReferenceOutOfScope);
          expect(issues[0]?.message.params?.['position']).toBeNumber();
        },
      ),
    );
  });
});
