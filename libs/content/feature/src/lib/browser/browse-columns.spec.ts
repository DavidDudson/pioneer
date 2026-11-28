import { FRONTIER_PROPERTY_KINDS } from '@pioneer/frontier/data';
import type { PropertyContext, TableFromPropertiesOptions } from '@pioneer/frontier/data';
import { RULES_PROPERTY_KINDS } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { featBrowseColumns } from './browse-columns';

const CONTEXT: PropertyContext = {
  compareText: (left, right) => left.localeCompare(right),
  formatNumber: String,
  formatDate: (value) => value.toString(),
  translate: (key) => key,
};

const OPTIONS: TableFromPropertiesOptions = {
  kinds: new Map([...FRONTIER_PROPERTY_KINDS, ...RULES_PROPERTY_KINDS].map((kind) => [kind.id, kind])),
  context: CONTEXT,
};

describe(featBrowseColumns, () => {
  const columns = featBrowseColumns(true, OPTIONS);

  it('lists the name and kind, then the feat properties, then the source and legacy columns', () => {
    expect(columns.map((column) => column.id)).toStrictEqual([
      'name',
      'kind',
      'level',
      'category',
      'actions',
      'traits',
      'prerequisites',
      'source',
      'legacy',
    ]);
  });

  it('keeps the codes a shared link already names', () => {
    const codes = Object.fromEntries(columns.map((column) => [column.id, column.meta?.code]));

    expect(codes).toMatchObject({ name: 'name', kind: 'kind', level: 'lvl', traits: 'trt', source: 'src' });
    expect(codes).toMatchObject({ category: 'cat', actions: 'act', prerequisites: 'pre' });
  });

  it('lets every column but the name be hidden', () => {
    const hideable = columns.map((column) => [column.id, column.meta?.hideable]);

    expect(hideable).toStrictEqual([
      ['name', false],
      ['kind', true],
      ['level', true],
      ['category', true],
      ['actions', true],
      ['traits', true],
      ['prerequisites', true],
      ['source', true],
      ['legacy', true],
    ]);
  });

  it('hides the kind at first', () => {
    expect(columns.find((column) => column.id === 'kind')?.meta?.defaultHidden).toBe(true);
  });
});
