import { describe, expect, test } from 'bun:test';

import { facetQuery, otherConditions } from './facet-counts';
import { FilterKind } from './filter-condition';
import type { FilterCondition } from './filter-condition';

const PROPERTIES = { name: FilterKind.Text, level: FilterKind.Number, trait: FilterKind.Set } as const;

describe('facetQuery', () => {
  const schema = facetQuery(PROPERTIES);

  test('takes a countable property, the other conditions, a search and a page', () => {
    const filters = JSON.stringify([{ property: 'level', operator: 'gte', values: ['2'] }]);
    const query = schema.parse({ property: 'trait', filters, search: ' fi ', page: '2' });

    expect(query).toMatchObject({ property: 'trait', search: 'fi', page: 2 });
    expect(query.filters).toHaveLength(1);
  });

  test('defaults to the first page and no conditions', () => {
    expect(schema.parse({ property: 'trait' })).toMatchObject({ page: 1, filters: [] });
  });

  test.each([
    ['a text property', { property: 'name' }],
    ['an unknown property', { property: 'owner' }],
    ['a page below the first', { property: 'trait', page: '0' }],
    ['an empty search', { property: 'trait', search: ' ' }],
    ['a stray parameter', { property: 'trait', sort: 'name' }],
    [
      'conditions on an unknown property',
      { property: 'trait', filters: '[{"property":"x","operator":"is","values":["1"]}]' },
    ],
  ])('rejects %s', (_name, query) => {
    expect(schema.safeParse(query).success).toBe(false);
  });
});

describe('otherConditions', () => {
  test('drops every condition on the property, keeping the rest in order', () => {
    const level: FilterCondition = { property: 'level', operator: 'gt', values: ['1'] };
    const fire: FilterCondition = { property: 'trait', operator: 'is', values: ['fire'] };
    const evil: FilterCondition = { property: 'trait', operator: 'isNot', values: ['evil'] };

    expect(otherConditions([fire, level, evil], 'trait')).toStrictEqual([level]);
  });
});
