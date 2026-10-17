import { FilterOperator } from '@pioneer/frontier';
import type { FilterCondition } from '@pioneer/frontier';
import { ContentKind, facetsFor } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { facetTextCodec } from './facet-text';

const CODEC = facetTextCodec(() => facetsFor([ContentKind.Feat]));

const FIGHTER: FilterCondition = { field: 'traits', operator: FilterOperator.Is, values: ['fighter'] };
const NOT_EVIL: FilterCondition = { field: 'traits', operator: FilterOperator.IsNot, values: ['evil'] };
const LEVEL: FilterCondition = { field: 'level', operator: FilterOperator.Between, values: ['1', '5'] };

describe('facet text codec', () => {
  it('writes the facet url text, a segment per facet', () => {
    expect(CODEC.encode([FIGHTER, NOT_EVIL, LEVEL])).toBe('level:1..5~traits:fighter,!evil');
  });

  it('writes nothing for no filters', () => {
    expect(CODEC.encode([])).toBe('');
  });

  it('reads the text back to the same chips', () => {
    expect(CODEC.decode(CODEC.encode([FIGHTER, NOT_EVIL, LEVEL]))).toStrictEqual(
      CODEC.decode('traits:fighter,!evil~level:1..5'),
    );
    expect(CODEC.decode('level:1..5')).toStrictEqual([LEVEL]);
  });

  it('drops segments that name no facet or have no values', () => {
    expect(CODEC.decode('nope:fire~:x~traits~level:abc~traits:fighter')).toStrictEqual([FIGHTER]);
  });
});
