import { describe, expect, test } from 'bun:test';

import { archivableDeleteTarget } from './archive-rules.ts';

const TABLES: ReadonlySet<string> = new Set(['characters']);

function call(method: string, table: string): unknown {
  return {
    type: 'CallExpression',
    callee: { type: 'MemberExpression', property: { name: method } },
    arguments: [{ type: 'Identifier', name: table }],
  };
}

describe('archivableDeleteTarget', () => {
  test('names an archivable table being deleted from', () => {
    expect(archivableDeleteTarget(call('delete', 'characters'), TABLES)).toBe('characters');
  });

  test('ignores a table that is not archived', () => {
    expect(archivableDeleteTarget(call('delete', 'sessions'), TABLES)).toBeUndefined();
  });

  test('ignores other methods on an archivable table', () => {
    expect(archivableDeleteTarget(call('update', 'characters'), TABLES)).toBeUndefined();
  });

  test('ignores a delete whose argument is not a plain table name', () => {
    const map = {
      type: 'CallExpression',
      callee: { type: 'MemberExpression', property: { name: 'delete' } },
      arguments: [{ type: 'Literal' }],
    };
    expect(archivableDeleteTarget(map, TABLES)).toBeUndefined();
  });
});
