import { describe, expect, test } from 'bun:test';

import {
  catalogProblems,
  compareKeys,
  coverage,
  findKeyLiterals,
  flattenMessages,
  isComplete,
  isCoreScope,
  localeChain,
  scopeOf,
  SourceKind,
  syncCatalog,
  UNTRANSLATED,
} from './message-keys.ts';

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

describe('syncCatalog', () => {
  const english = { list: { title: 'Characters', empty: 'None' }, ancestryOption: '{name}' };

  test('adds a message en gained as untranslated and keeps what is translated', () => {
    const existing = { list: { title: 'Charaktere' } };
    expect(syncCatalog(english, existing)).toStrictEqual({
      list: { title: 'Charaktere', empty: UNTRANSLATED },
      ancestryOption: UNTRANSLATED,
    });
  });

  test('drops a message en lost, and a group that became text', () => {
    const existing = {
      list: { title: 'Charaktere', empty: 'Keine', gone: 'Weg' },
      ancestryOption: { nested: 'x' },
      old: 'Alt',
    };

    expect(syncCatalog(english, existing)).toStrictEqual({
      list: { title: 'Charaktere', empty: 'Keine' },
      ancestryOption: UNTRANSLATED,
    });
  });

  test('builds a whole skeleton from nothing, and a second run changes nothing', () => {
    const once = syncCatalog(english, undefined);
    expect(flattenMessages(once)).toStrictEqual(flattenMessages(english));
    expect(syncCatalog(english, once)).toStrictEqual(once);
  });
});

describe('localeChain', () => {
  test('lists a regional tag then its parents', () => {
    expect(localeChain('pt-BR')).toStrictEqual(['pt-BR', 'pt']);
    expect(localeChain('de')).toStrictEqual(['de']);
    expect(localeChain('zh-Hant-TW')).toStrictEqual(['zh-Hant-TW', 'zh-Hant', 'zh']);
  });
});

describe('coverage', () => {
  const english = { alpha: 'A', beta: 'B', gamma: { delta: 'D' } };

  test('counts translated messages, empty strings as missing', () => {
    expect(coverage(english, [{ alpha: 'x', beta: UNTRANSLATED, gamma: { delta: 'y' } }])).toStrictEqual({
      translated: 2,
      total: 3,
    });
  });

  test('judges an overrides-only regional catalog with its parent', () => {
    const portuguese = { alpha: 'x', beta: 'y', gamma: { delta: 'z' } };
    const brazilian = { beta: 'y-BR' };
    expect(isComplete(coverage(english, [brazilian, portuguese]))).toBe(true);
    expect(isComplete(coverage(english, [brazilian]))).toBe(false);
  });

  test('a source with no messages is whole', () => {
    expect(isComplete(coverage({}, [{}]))).toBe(true);
  });
});

describe('catalogProblems', () => {
  const english = { gems: '{count, plural, one {# gem} other {# gems}}', title: 'Characters', owner: 'Owner {name}' };

  test('is quiet for a faithful, partial catalog', () => {
    expect(
      catalogProblems(english, {
        gems: '{count, plural, one {# Edelstein} other {# Edelsteine}}',
        title: UNTRANSLATED,
      }),
    ).toStrictEqual([]);
  });

  test('reports stale keys', () => {
    expect(catalogProblems(english, { removed: 'Weg' })).toStrictEqual(['stale key (not in en): removed']);
  });

  test('reports invalid ICU', () => {
    const [problem] = catalogProblems(english, { owner: 'Besitzer {name' });
    expect(problem).toContain('invalid ICU in owner');
  });

  test('reports a translation that drops a parameter', () => {
    expect(catalogProblems(english, { gems: 'Edelsteine' })).toStrictEqual([
      'parameters differ from en in gems: drops {count}',
    ]);
  });

  test('does not compare parameters against an en message that does not parse', () => {
    expect(catalogProblems({ broken: '{oops' }, { broken: 'Kaputt' })).toStrictEqual([]);
  });
});

describe('isCoreScope', () => {
  test('the shell, identity and character must be whole; other scopes may be partial', () => {
    expect(isCoreScope(undefined)).toBe(true);
    expect(isCoreScope('identity')).toBe(true);
    expect(isCoreScope('character')).toBe(true);
    expect(isCoreScope('homebrew')).toBe(false);
  });
});
