import { describe, expect, test } from 'bun:test';

import { compareKeys, findKeyLiterals, flattenMessages, scopeOf, SourceKind } from './message-keys.ts';

const namespaces = new Set(['character', 'problem']);

describe('flattenMessages', () => {
  test('dots nested keys under an optional scope prefix', () => {
    const tree = { list: { title: 'Characters', empty: 'None' }, ancestryOption: '{name}' };
    expect(flattenMessages(tree, 'character')).toStrictEqual([
      'character.list.title',
      'character.list.empty',
      'character.ancestryOption',
    ]);
    expect(flattenMessages({ problem: { notFound: 'Gone' } })).toStrictEqual(['problem.notFound']);
  });
});

describe('findKeyLiterals', () => {
  test('finds quoted keys in known namespaces in TypeScript', () => {
    const source = `message('problem.notFound'); const k = "character.sheet.name"; import x from './a.b';`;
    expect(findKeyLiterals(source, SourceKind.TypeScript, namespaces)).toStrictEqual([
      'problem.notFound',
      'character.sheet.name',
    ]);
  });

  test('in templates, only single-quoted strings are keys', () => {
    const template = `<fr-date [value]="character.updatedAt" /> {{ 'character.list.updated' | transloco }}`;
    expect(findKeyLiterals(template, SourceKind.Template, namespaces)).toStrictEqual(['character.list.updated']);
  });
});

describe('compareKeys', () => {
  test('reports missing and unused keys, sorted', () => {
    const defined = new Set(['character.b', 'character.a', 'character.used']);
    const used = new Set(['character.used', 'character.ghost']);
    expect(compareKeys(defined, used)).toStrictEqual({
      missing: ['character.ghost'],
      unused: ['character.a', 'character.b'],
    });
  });
});

describe('scopeOf', () => {
  test('reads the scope from provideMessageScope', () => {
    expect(scopeOf(['const a = 1;', `provideMessageScope('character', { en: load })`])).toBe('character');
    expect(scopeOf(['const a = 1;'])).toBeUndefined();
  });
});
