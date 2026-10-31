import { describe, expect, test } from 'bun:test';

import { ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { Character } from './character';
import { SlotInvalidMessage, SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  DEDICATION_CLASS,
  DEDICATION_FIXTURES,
  dedicationFixtureId,
  dedicationSlot,
  skillFixtures,
} from './testing';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(DEDICATION_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

/** A 1st-level character who plans Warden Dedication (needs Power Attack) for 3rd level, with Power Attack at `first`. */
function planning(first: 'power-attack' | 'medic-basic'): Character {
  return new CharacterBuilder()
    .picking('class', DEDICATION_CLASS)
    .atLevel(1)
    .picking(dedicationSlot(1), dedicationFixtureId(first))
    .picking(dedicationSlot(3), dedicationFixtureId('warden-dedication'))
    .build();
}

const slotThree = (first: 'power-attack' | 'medic-basic'): unknown =>
  characterSlots(planning(first).document, content).find((slot) => slot.key === dedicationSlot(3));

describe('a planned pick that stops holding (#493)', () => {
  test('reads planned while what it needs is planned before it', () => {
    expect(slotThree('power-attack')).toMatchObject({ status: SlotStatus.Planned, level: 3 });
  });

  test('is flagged at the level it opens, with the reason, once what it needed is gone', () => {
    expect(slotThree('medic-basic')).toMatchObject({
      status: SlotStatus.Invalid,
      level: 3,
      reason: { key: SlotInvalidMessage.PrerequisitesNotMet },
    });
  });
});
