import { describe, expect, test } from 'bun:test';

import { ContentNamespace, derivedId, newId, UuidSchema } from './id';

describe('ids', () => {
  test('newId is a random UUIDv4', () => {
    const id = newId();
    expect(UuidSchema.safeParse(id).success).toBe(true);
    expect(id[14]).toBe('4');
    expect(newId()).not.toBe(id);
  });

  test('derivedId is a stable UUIDv5 of its name', () => {
    const human = derivedId(ContentNamespace, 'player-core/human');
    expect(human).toBe(derivedId(ContentNamespace, 'player-core/human'));
    expect(human).not.toBe(derivedId(ContentNamespace, 'player-core/elf'));
    expect(human[14]).toBe('5');
  });
});
