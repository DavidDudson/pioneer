import { describe, expect, test } from 'bun:test';

import { ContentId } from './content-id';
import { Trait, traitId } from './trait';

describe('traitId', () => {
  test('is the id the committed Apex trait entry carries', () => {
    expect(traitId(Trait.parse('apex'))).toBe(ContentId.parse('fe788f76-f8db-5863-9455-45aea77a5cd9'));
  });

  test('differs per trait', () => {
    expect(traitId(Trait.parse('fire'))).not.toBe(traitId(Trait.parse('cold')));
  });
});
