import { describe, expect, test } from 'bun:test';

import { enricherParams, enricherParts } from './foundry-enricher';

describe('enricherParts', () => {
  test('finds @Name[...] with nested brackets and a label, between the text around it', () => {
    expect(enricherParts('Deal @Damage[2d6[fire],1d4[persistent,fire]]{fire} now.')).toEqual([
      'Deal ',
      { form: 'named', name: 'Damage', params: '2d6[fire],1d4[persistent,fire]', label: 'fire' },
      ' now.',
    ]);
  });

  test('finds [[/cmd ...]] with nested brackets, the label optional', () => {
    expect(enricherParts('[[/r (1[splash])[fire]]] and [[/act trip]]{Trip}')).toEqual([
      { form: 'command', command: 'r', args: '(1[splash])[fire]', label: undefined },
      ' and ',
      { form: 'command', command: 'act', args: 'trip', label: 'Trip' },
    ]);
  });

  test('anything unterminated, or not an enricher, stays text', () => {
    expect(enricherParts('@Check[reflex and [[/r 1d4 and @lower[x] and {braces}')).toEqual([
      '@Check[reflex and [[/r 1d4 and @lower[x] and {braces}',
    ]);
  });

  test('an unclosed label is text after the enricher', () => {
    expect(enricherParts('@UUID[a.b]{open')).toEqual([
      { form: 'named', name: 'UUID', params: 'a.b', label: undefined },
      '{open',
    ]);
  });
});

describe('enricherParams', () => {
  test('a first part with no colon is stored under the given name; flags are empty', () => {
    expect([...enricherParams('reflex|dc:20|basic|options:a,b', 'type')]).toEqual([
      ['type', 'reflex'],
      ['dc', '20'],
      ['basic', ''],
      ['options', 'a,b'],
    ]);
  });

  test('a first part with a colon is a parameter like any other', () => {
    expect([...enricherParams('type:will|against:class', 'type')]).toEqual([
      ['type', 'will'],
      ['against', 'class'],
    ]);
  });
});
