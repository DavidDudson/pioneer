import { describe, expect, test } from 'bun:test';

import { capitalise } from './capitalise';

describe('capitalise', () => {
  test('raises the first letter and keeps the rest', () => {
    expect(capitalise('fire bolt')).toBe('Fire bolt');
    expect(capitalise('aRCANE')).toBe('ARCANE');
  });

  test('leaves an empty text empty', () => {
    expect(capitalise('')).toBe('');
  });
});
