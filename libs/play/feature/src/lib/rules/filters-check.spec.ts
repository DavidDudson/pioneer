import { describe, expect, it } from 'vitest';

import { EXAMPLE_FILTER_ENTRIES, EXAMPLE_FILTER_QUERY } from './filter-examples';
import { checkFilters, FiltersStatus } from './filters-check';
import type { FiltersCheck } from './filters-check';
import { CheckStatus } from './rules-check';

type ValidFilters = Extract<FiltersCheck, { status: typeof FiltersStatus.Valid }>;

function valid(result: FiltersCheck): ValidFilters {
  if (result.status !== FiltersStatus.Valid) {
    throw new Error('Expected the entries to read');
  }
  return result;
}

/** A facet's counts as `value:count`, in the order the result lists them. */
function counts(result: FiltersCheck, id: string): string[] {
  const facet = valid(result).counts.find((each) => each.facet.id === id);
  return (facet?.values ?? []).map(({ value, count }) => `${value}:${count}`);
}

describe(checkFilters, () => {
  it('keeps the example entries the example query asks for', () => {
    const result = valid(checkFilters(EXAMPLE_FILTER_ENTRIES, EXAMPLE_FILTER_QUERY));

    expect(result.total).toBe(29);
    expect(result.kept.map((entry) => entry.name)).toContain('Longsword');
    expect(result.kept.map((entry) => entry.name)).not.toContain('Fireball');
    expect(result.query).toBe(EXAMPLE_FILTER_QUERY);
  });

  it('keeps everything with no query', () => {
    const result = valid(checkFilters(EXAMPLE_FILTER_ENTRIES, ''));

    expect(result.kept).toHaveLength(result.total);
    expect(result.query).toBe('');
  });

  it('counts what each value would leave, with picked values listed at zero', () => {
    const result = checkFilters(EXAMPLE_FILTER_ENTRIES, EXAMPLE_FILTER_QUERY);

    expect(counts(result, 'rarity')).toStrictEqual(['common:11', 'uncommon:0']);
    expect(counts(result, 'traits')).toContain('fire:0');
    expect(counts(result, 'level')).toStrictEqual(['-1:1', '0:5', '1:3', '3:1', '4:1']);
  });

  it('offers the spell facets when the list holds a spell', () => {
    const result = checkFilters(EXAMPLE_FILTER_ENTRIES, 'f.tradition=primal');

    expect(valid(result).kept.map((entry) => entry.name)).toStrictEqual(['Fireball']);
    expect(counts(result, 'tradition')).toStrictEqual(['arcane:1', 'primal:1']);
  });

  it('writes the query back canonically, dropping what does not read', () => {
    const result = valid(checkFilters(EXAMPLE_FILTER_ENTRIES, '?f.traits=!fire,magical,Bad&f.level=x..&page=2'));

    expect(result.query).toBe('f.traits=magical,!fire');
  });

  it('reports entries that do not read', () => {
    expect(checkFilters('[{"kind": "spell"}]', '')).toMatchObject({
      status: FiltersStatus.Problems,
      entries: { status: CheckStatus.Invalid },
    });
    expect(checkFilters('not json', '')).toStrictEqual({
      status: FiltersStatus.Problems,
      entries: { status: CheckStatus.NotJson },
    });
  });
});
