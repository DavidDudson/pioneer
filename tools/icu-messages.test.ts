import { describe, expect, test } from 'bun:test';

import { icuProblem, messageParameters, parameterMismatch } from './icu-messages.ts';

describe('messageParameters', () => {
  test('finds plain, formatted and plural arguments, sorted', () => {
    expect(
      messageParameters('{name} has {count, plural, one {# gem} other {# gems}} worth {price, number}'),
    ).toStrictEqual(['count', 'name', 'price']);
  });

  test('walks nested select and plural arms', () => {
    const message =
      '{kind, select, gem {{count, plural, one {{owner} owns a gem} other {{owner} owns gems}}} other {none}}';

    expect(messageParameters(message)).toStrictEqual(['count', 'kind', 'owner']);
  });

  test('has none for plain text, and `#` is not one', () => {
    expect(messageParameters('Characters')).toStrictEqual([]);
    expect(messageParameters('{n, plural, other {# left}}')).toStrictEqual(['n']);
  });
});

describe('icuProblem', () => {
  test('accepts a valid message', () => {
    expect(icuProblem('{count, plural, one {# gem} other {# gems}}')).toBeUndefined();
  });

  test('names the syntax error of a broken one', () => {
    expect(icuProblem('{Such compliance')).toContain('invalid syntax');
    expect(icuProblem('{count, plural, one {# gem}')).toBeDefined();
  });
});

describe('parameterMismatch', () => {
  test('agrees when the translation keeps every parameter, whatever its plural arms', () => {
    const source = '{count, plural, one {# gem} other {# gems}}';
    const french = '{count, plural, one {# gemme} many {# de gemmes} other {# gemmes}}';
    expect(parameterMismatch(source, french)).toBeUndefined();
  });

  test('reports a dropped parameter', () => {
    expect(parameterMismatch('{count} gems for {name}', 'Edelsteine für {name}')).toStrictEqual({
      dropped: ['count'],
      added: [],
    });
  });

  test('reports an invented parameter', () => {
    expect(parameterMismatch('Hello', 'Hallo {name}')).toStrictEqual({ dropped: [], added: ['name'] });
  });
});
