import { describe, expect, test } from 'bun:test';

import { ActionCost, ContentId, Frequency, RuleElement } from '@pioneer/rules/sdk';
import { assert, boolean, constantFrom, property, record } from 'fast-check';

import { appliesAutomatically } from './triggered-abilities';

const ID = ContentId.parse('00000000-0000-4000-8000-000000000001');
const TEMP_HP = RuleElement.parse({ key: 'TempHP', value: 5 });
const FREQUENCY = Frequency.parse({ max: 1, per: 'day' });

const costs = [...Object.values(ActionCost), undefined];

const situations = record({
  cost: constantFrom(...costs),
  limited: boolean(),
  spendsResource: boolean(),
  needsChoice: boolean(),
});

const costly = situations.filter(
  ({ cost, limited, spendsResource, needsChoice }) => cost !== undefined || limited || spendsResource || needsChoice,
);

describe('triggered abilities (properties)', () => {
  test('nothing that costs an action, a frequency, a resource or a choice applies by itself', () => {
    assert(
      property(costly, ({ cost, limited, spendsResource, needsChoice }) => {
        const applied = appliesAutomatically({
          id: ID,
          triggerEvent: undefined,
          cost,
          frequency: limited ? FREQUENCY : undefined,
          spendsResource,
          needsChoice,
          rules: [TEMP_HP],
        });

        expect(applied).toBe(false);
      }),
    );
  });
});
