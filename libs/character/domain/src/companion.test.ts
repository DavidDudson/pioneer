import { describe, expect, test } from 'bun:test';

import { CompanionKind, ContentId, SlotKey } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { AddCompanionBody, COMPANION_LIVE_LIMIT, LiveCompanionCount } from './companion';

const body = {
  name: 'Ash',
  grantedBy: SlotKey.parse('animal-companion:0'),
  expectedVersion: 1,
};

describe('adding a companion', () => {
  test('an animal companion names its species', () => {
    const species = ContentId.parse(newId());
    const parsed = AddCompanionBody.safeParse({ ...body, kind: CompanionKind.AnimalCompanion, form: { species } });
    expect(parsed.success).toBe(true);
  });

  test('an animal companion without a species is refused', () => {
    const parsed = AddCompanionBody.safeParse({ ...body, kind: CompanionKind.AnimalCompanion, form: {} });
    expect(parsed.success).toBe(false);
  });

  test('a familiar form stays open', () => {
    const parsed = AddCompanionBody.safeParse({ ...body, kind: CompanionKind.Familiar, form: { anything: 1 } });
    expect(parsed.success).toBe(true);
  });
});

describe('the live limit', () => {
  test('is one familiar', () => {
    expect(COMPANION_LIVE_LIMIT[CompanionKind.Familiar]).toBe(LiveCompanionCount.parse(1));
  });

  test('is four animal companions', () => {
    expect(COMPANION_LIVE_LIMIT[CompanionKind.AnimalCompanion]).toBe(LiveCompanionCount.parse(4));
  });
});
