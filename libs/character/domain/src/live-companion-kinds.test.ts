import { describe, expect, test } from 'bun:test';

import { CompanionKind, SlotKey } from '@pioneer/rules/sdk';
import { newId, Temporal } from '@pioneer/shared/kernel';

import { CompanionArchiveReason, CompanionId, CompanionName } from './companion';
import type { Companion } from './companion';
import { liveCompanionKinds } from './live-companion-kinds';

const NOW = Temporal.Instant.from('2026-10-07T10:00:00Z');

const familiar = (archived: boolean): Companion => {
  const companion: Companion = {
    id: CompanionId.parse(newId()),
    kind: CompanionKind.Familiar,
    name: CompanionName.parse('Pip'),
    form: {},
    grantedBy: SlotKey.parse('class:feat:1'),
    createdAt: NOW,
  };

  return archived ? { ...companion, archived: { at: NOW, reason: CompanionArchiveReason.Released } } : companion;
};

describe('live companion kinds', () => {
  test('are none without a companion', () => {
    expect(liveCompanionKinds([])).toStrictEqual([]);
  });

  test('include the kind of a live companion', () => {
    expect(liveCompanionKinds([familiar(false)])).toStrictEqual([CompanionKind.Familiar]);
  });

  test('leave out an archived companion', () => {
    expect(liveCompanionKinds([familiar(true)])).toStrictEqual([]);
  });
});
