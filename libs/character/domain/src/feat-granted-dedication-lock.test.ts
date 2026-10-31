import { describe, expect, test } from 'bun:test';

import { ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { assert, integer, property } from 'fast-check';

import { featSlots } from './feat-slots';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  DEDICATION_FIXTURES,
  dedicationFixtureId,
  dedicationSlot,
  GRANTING_CLASS,
  skillFixtures,
} from './testing';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(DEDICATION_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

/** A character of the class whose features grant Medic's dedication at 1st level, its basic feat at 3rd, its advanced at 5th. */
function granted(level: number): CharacterBuilder {
  return new CharacterBuilder().picking('class', GRANTING_CLASS).atLevel(level);
}

/** What the Sentinel dedication waits on in the archetype slot opening at `slotLevel`, if it is locked. */
function sentinelWait(builder: CharacterBuilder, slotLevel: number): unknown {
  const slot = featSlots(builder.build().document, content).find(
    ({ key }) => key === dedicationSlot(slotLevel, GRANTING_CLASS),
  );
  return slot?.options.find(({ value }) => value === dedicationFixtureId('sentinel-dedication'))?.locked;
}

describe('feats a feature grants count toward the dedication lock (#625)', () => {
  test('a granted dedication keeps another dedication out of reach', () => {
    expect(sentinelWait(granted(2), 1)).toMatchObject({ needed: 2 });
    expect(sentinelWait(granted(2), 2)).toMatchObject({ needed: 2 });
  });

  test('a granted archetype feat counts at the level it is granted, and the lock lifts when the second arrives', () => {
    expect(sentinelWait(granted(3), 2)).toMatchObject({ needed: 2 });
    expect(sentinelWait(granted(3), 3)).toMatchObject({ needed: 1 });
    expect(sentinelWait(granted(5), 4)).toMatchObject({ needed: 1 });
    expect(sentinelWait(granted(5), 5)).toBeUndefined();
  });

  test('a feat both granted and picked counts once', () => {
    const picked = granted(3).picking(dedicationSlot(2, GRANTING_CLASS), dedicationFixtureId('medic-basic'));
    expect(sentinelWait(picked, 3)).toMatchObject({ needed: 1 });
  });

  test('the lock only lifts with the level the grants arrive, whatever the later levels hold', () => {
    assert(
      property(integer({ min: 1, max: 2 }), integer({ min: 3, max: 6 }), (early, later) => {
        expect(sentinelWait(granted(later), early)).toMatchObject({ needed: 2 });
      }),
    );
  });
});
