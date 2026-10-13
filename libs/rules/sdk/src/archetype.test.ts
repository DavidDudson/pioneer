import { describe, expect, test } from 'bun:test';

import { ArchetypeData, DEDICATION_LOCK_DEFAULT, DedicationLock } from './archetype';
import { ContentId } from './content-id';

const dedication = ContentId.parse(crypto.randomUUID());

describe('ArchetypeData', () => {
  test('takes an archetype without a lock, and one with its own', () => {
    expect(ArchetypeData.safeParse({ dedication }).success).toBe(true);
    expect(ArchetypeData.safeParse({ dedication, dedicationLock: 1 }).success).toBe(true);
  });

  test('a lock is at least one feat', () => {
    expect(ArchetypeData.safeParse({ dedication, dedicationLock: 0 }).success).toBe(false);
  });

  test('Player Core asks for two other feats', () => {
    expect(DEDICATION_LOCK_DEFAULT).toBe(DedicationLock.parse(2));
  });
});
