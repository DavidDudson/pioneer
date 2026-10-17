/* oxlint-disable id-length -- the query keys are one letter by design */
import {
  array,
  assert,
  constantFrom,
  integer,
  option,
  property,
  record,
  string,
  subarray,
  uniqueArray,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { decodeTableView, encodeTableView, TYPICAL_VIEW_LENGTH } from './table-view';
import type { TableView, TableViewSchema } from './table-view.types';

const SCHEMA: TableViewSchema = {
  defaultPageSize: 25,
  columns: [
    { id: 'name', code: 'name' },
    { id: 'level', code: 'lvl' },
    { id: 'source', code: 'src' },
    { id: 'book', code: 'bk', defaultHidden: true },
    { id: 'rarity', code: 'rar' },
  ],
};
const IDS = SCHEMA.columns.map((column) => column.id);

/** A view as the table holds it: sorts over distinct columns, hidden columns in schema order. */
const viewArb: Arbitrary<TableView> = record({
  sort: uniqueArray(constantFrom(...IDS), { maxLength: 3 }).chain((columns) =>
    array(constantFrom(true, false), { minLength: columns.length, maxLength: columns.length }).map((flags) =>
      columns.map((column, index) => ({ column, descending: flags[index] ?? false })),
    ),
  ),
  hidden: subarray(IDS),
  pageSize: option(integer({ min: 1, max: 500 }), { nil: undefined }),
  search: option(string({ maxLength: 40 }), { nil: undefined }),
  facets: option(string({ maxLength: 60 }), { nil: undefined }),
});

/** What a view means once the defaults fill in what it leaves out, with hidden columns in schema order. */
function meaning(view: TableView): Required<TableView> {
  const hidden = view.hidden ?? ['book'];
  return {
    sort: view.sort ?? [],
    hidden: IDS.filter((id) => hidden.includes(id)),
    pageSize: view.pageSize ?? SCHEMA.defaultPageSize ?? 0,
    search: view.search ?? '',
    facets: view.facets ?? '',
  };
}

describe('table view codec', () => {
  it('writes nothing for the default view', () => {
    expect(encodeTableView({}, SCHEMA)).toStrictEqual({});
    expect(encodeTableView({ pageSize: 25, hidden: ['book'], sort: [], search: '' }, SCHEMA)).toStrictEqual({});
  });

  it('writes the compact form of the issue example', () => {
    const view: TableView = {
      sort: [
        { column: 'level', descending: true },
        { column: 'name', descending: false },
      ],
      hidden: ['source', 'book'],
      facets: 'tr:fire~tr!ice',
    };
    expect(encodeTableView(view, SCHEMA)).toStrictEqual({ s: '-lvl,name', f: 'tr:fire~tr!ice', c: '-src' });
    expect(encodeTableView({ ...view, hidden: ['source'] }, SCHEMA)).toStrictEqual({
      s: '-lvl,name',
      f: 'tr:fire~tr!ice',
      c: '-src,+bk',
    });
  });

  it('reads params back to a view', () => {
    expect(decodeTableView({ s: '-lvl,name', c: '-src,+bk', n: '50', q: 'fire' }, SCHEMA)).toStrictEqual({
      sort: [
        { column: 'level', descending: true },
        { column: 'name', descending: false },
      ],
      hidden: ['source'],
      pageSize: 50,
      search: 'fire',
    });
  });

  it('drops what is malformed instead of failing', () => {
    const view = decodeTableView(
      { s: 'nope,,-zzz,lvl,-lvl', c: 'src,*bk,+nope,-', n: '-4', q: ['a', 'b'], f: 7, other: 'x' },
      SCHEMA,
    );
    expect(view).toStrictEqual({ sort: [{ column: 'level', descending: false }], hidden: ['book'], search: 'a' });
  });

  it('takes the first of a repeated param and ignores non-text', () => {
    expect(decodeTableView({ n: ['10', '20'] }, SCHEMA)).toStrictEqual({ pageSize: 10 });
    expect(decodeTableView({ n: 12, s: { a: 1 } }, SCHEMA)).toStrictEqual({});
  });

  it('round-trips any view to the same params', () => {
    assert(
      property(viewArb, (view) => {
        const params = encodeTableView(view, SCHEMA);
        expect(encodeTableView(decodeTableView(params, SCHEMA), SCHEMA)).toStrictEqual(params);
      }),
    );
  });

  it('round-trips the parts it writes', () => {
    assert(
      property(viewArb, (view) => {
        const decoded = decodeTableView(encodeTableView(view, SCHEMA), SCHEMA);
        expect(meaning(decoded)).toStrictEqual(meaning(view));
      }),
    );
  });

  it('stays under the documented length for a typical view', () => {
    const typical: Arbitrary<TableView> = record({
      sort: constantFrom(
        [],
        [{ column: 'level', descending: true }],
        [
          { column: 'rarity', descending: false },
          { column: 'name', descending: true },
        ],
      ),
      hidden: subarray(IDS),
      pageSize: option(integer({ min: 1, max: 500 }), { nil: undefined }),
      search: option(string({ maxLength: 30 }), { nil: undefined }),
    });
    assert(
      property(typical, (view) => {
        const query = new URLSearchParams(encodeTableView(view, SCHEMA)).toString();
        expect(query.length).toBeLessThanOrEqual(TYPICAL_VIEW_LENGTH);
      }),
    );
  });
});
