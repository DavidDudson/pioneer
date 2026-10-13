import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentId, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, option, property } from 'fast-check';

import type { CharacterDocument } from './character-document';
import { SlotInvalidMessage, SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { featSlots } from './feat-slots';
import { slotContent, slotRefusal } from './slot-offer';
import {
  CharacterBuilder,
  DEDICATION_CLASS,
  DEDICATION_FIXTURES,
  dedicationSlot,
  dedicationArchetypeId,
  dedicationFixtureId,
  skillFixtures,
} from './testing';
import type { DedicationFixture } from './testing';

const idOf = dedicationFixtureId;

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(DEDICATION_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

function character(level = 6): CharacterBuilder {
  return new CharacterBuilder().picking('class', DEDICATION_CLASS).atLevel(level);
}

/** A character with each feat picked in the slot of the level of its position: the first at 1st level, and so on. */
function taking(...feats: readonly DedicationFixture[]): CharacterBuilder {
  let builder = character();
  for (const [index, feat] of feats.entries()) {
    builder = builder.picking(dedicationSlot(index + 1), idOf(feat));
  }
  return builder;
}

function slotOf(builder: CharacterBuilder, slot: SlotKey): unknown {
  return characterSlots(builder.build().document, content).find((each) => each.key === slot);
}

function optionOf(builder: CharacterBuilder, slot: SlotKey, feat: DedicationFixture): unknown {
  const read = featSlots(builder.build().document, content).find((each) => each.key === slot);
  return read?.options.find((each) => each.value === idOf(feat))?.locked;
}

function refusal(builder: CharacterBuilder, slot: SlotKey, feat: DedicationFixture): unknown {
  return slotRefusal(builder.build().document, content, { slot, selection: ChoiceValue.parse(idOf(feat)) });
}

const MEDIC_WAIT = { archetype: dedicationArchetypeId('medic') };

describe('the dedication lock on feat slot offers', () => {
  test('a first dedication is open, and so is any feat of its archetype', () => {
    expect(optionOf(character(), dedicationSlot(1), 'medic-dedication')).toBeUndefined();
    expect(optionOf(character(), dedicationSlot(1), 'sentinel-dedication')).toBeUndefined();
  });

  test('another dedication is locked until two other feats of the first archetype are taken', () => {
    const afterDedication = taking('medic-dedication');
    expect(optionOf(afterDedication, dedicationSlot(2), 'sentinel-dedication')).toMatchObject({ needed: 2 });
    expect(optionOf(taking('medic-dedication', 'medic-basic'), dedicationSlot(3), 'sentinel-dedication')).toMatchObject(
      {
        needed: 1,
      },
    );
    expect(
      optionOf(taking('medic-dedication', 'medic-basic', 'medic-advanced'), dedicationSlot(4), 'sentinel-dedication'),
    ).toBe(undefined);
  });

  test('names the archetype the dedication waits on', () => {
    expect(optionOf(taking('medic-dedication'), dedicationSlot(2), 'sentinel-dedication')).toMatchObject(MEDIC_WAIT);
  });

  test('the dedication does not count among its archetype’s other feats', () => {
    expect(
      optionOf(taking('medic-dedication', 'medic-dedication'), dedicationSlot(3), 'sentinel-dedication'),
    ).toMatchObject({
      needed: 2,
    });
  });

  test('feats of the archetype and feats of none are never locked', () => {
    const afterDedication = taking('medic-dedication');
    expect(optionOf(afterDedication, dedicationSlot(2), 'medic-basic')).toBeUndefined();
    expect(optionOf(afterDedication, dedicationSlot(2), 'sentinel-basic')).toBeUndefined();
    expect(optionOf(afterDedication, dedicationSlot(2), 'power-attack')).toBeUndefined();
  });

  test('an archetype’s own lock replaces Player Core’s two', () => {
    expect(optionOf(taking('scout-dedication'), dedicationSlot(2), 'sentinel-dedication')).toMatchObject({ needed: 1 });
    expect(
      optionOf(taking('scout-dedication', 'scout-basic'), dedicationSlot(3), 'sentinel-dedication'),
    ).toBeUndefined();
  });

  test('only picks in earlier slots count, so a later feat does not lift the lock', () => {
    const planned = character()
      .picking(dedicationSlot(2), idOf('medic-dedication'))
      .picking(dedicationSlot(1), idOf('medic-basic'));
    expect(optionOf(planned, dedicationSlot(3), 'sentinel-dedication')).toMatchObject({ needed: 1 });
    expect(optionOf(planned, dedicationSlot(1), 'sentinel-dedication')).toBeUndefined();
  });

  test('a slot reads as if empty, so its own dedication does not lock it', () => {
    const picked = taking('medic-dedication');
    expect(optionOf(picked, dedicationSlot(1), 'sentinel-dedication')).toBeUndefined();
  });

  test('every dedication waits at once when two are taken', () => {
    const both = taking('medic-dedication', 'medic-basic', 'medic-advanced', 'sentinel-dedication');
    expect(optionOf(both, dedicationSlot(5), 'scout-dedication')).toMatchObject({
      archetype: dedicationArchetypeId('sentinel'),
      needed: 2,
    });
  });
});

describe('a taken dedication whose lock does not hold', () => {
  test('is flagged at its slot, with the reason', () => {
    expect(slotOf(taking('medic-dedication', 'medic-basic', 'sentinel-dedication'), dedicationSlot(3))).toMatchObject({
      status: SlotStatus.Invalid,
      selection: idOf('sentinel-dedication'),
      reason: { key: SlotInvalidMessage.DedicationLocked },
    });
  });

  test('is valid once two other feats of the first archetype come before it', () => {
    const builder = taking('medic-dedication', 'medic-basic', 'medic-advanced', 'sentinel-dedication');
    expect(slotOf(builder, dedicationSlot(4))).toMatchObject({ status: SlotStatus.Filled });
  });

  test('is flagged when the feat that lifted the lock is replaced and no longer counts', () => {
    const builder = taking('medic-dedication', 'medic-basic', 'medic-advanced', 'sentinel-dedication').picking(
      dedicationSlot(3),
      idOf('power-attack'),
    );
    expect(slotOf(builder, dedicationSlot(4))).toMatchObject({
      status: SlotStatus.Invalid,
      reason: { key: SlotInvalidMessage.DedicationLocked },
    });
  });

  test('is valid when the plan places it at a later level than the lock clears', () => {
    const planned = taking('medic-dedication', 'medic-basic', 'medic-advanced').picking(
      dedicationSlot(6),
      idOf('sentinel-dedication'),
    );
    const slot = dedicationSlot(6);
    expect(slotOf(planned, slot)).toMatchObject({ status: SlotStatus.Filled });
    const early = character(1)
      .picking(dedicationSlot(1), idOf('medic-dedication'))
      .picking(dedicationSlot(2), idOf('medic-basic'))
      .picking(dedicationSlot(3), idOf('medic-advanced'))
      .picking(slot, idOf('sentinel-dedication'));
    expect(slotOf(early, slot)).toMatchObject({ status: SlotStatus.Planned });
  });
});

describe('slotRefusal for a locked dedication', () => {
  test('refuses it with the dedication reason', () => {
    expect(refusal(taking('medic-dedication'), dedicationSlot(2), 'sentinel-dedication')).toEqual({
      field: 'selection',
      message: { key: 'character.validation.dedicationLocked' },
    });
  });

  test('takes it once the lock is lifted, and takes the first archetype’s feats while it waits', () => {
    const lifted = taking('medic-dedication', 'medic-basic', 'medic-advanced');
    expect(refusal(lifted, dedicationSlot(4), 'sentinel-dedication')).toBeUndefined();
    expect(refusal(taking('medic-dedication'), dedicationSlot(2), 'medic-basic')).toBeUndefined();
  });

  test('checks the slot as if empty: replacing the dedication that locks is not locked by itself', () => {
    expect(refusal(taking('medic-dedication'), dedicationSlot(1), 'sentinel-dedication')).toBeUndefined();
  });
});

const FEATS: readonly DedicationFixture[] = [
  'medic-dedication',
  'medic-basic',
  'medic-advanced',
  'sentinel-dedication',
  'sentinel-basic',
  'scout-dedication',
  'scout-basic',
  'power-attack',
];
const featPick = option(constantFrom(...FEATS), { nil: undefined });
const SLOT_PICKS = 6;
const picks = array(featPick, { minLength: SLOT_PICKS, maxLength: SLOT_PICKS });

/** The character with each feat that is picked in the slot of its position. */
function withPicks(chosen: readonly (DedicationFixture | undefined)[]): CharacterDocument {
  let builder = character();
  for (const [index, feat] of chosen.entries()) {
    if (feat !== undefined) {
      builder = builder.picking(dedicationSlot(index + 1), idOf(feat));
    }
  }
  return builder.build().document;
}

/** Whether selectSlot refuses `value` for `slot` in `document`. */
function refused(document: CharacterDocument, slot: SlotKey, value: ContentId): boolean {
  return slotRefusal(document, content, { slot, selection: ChoiceValue.parse(value) }) !== undefined;
}

describe('the dedication lock, over any picks', () => {
  test('a slot offers a feat locked exactly when selectSlot refuses it', () => {
    assert(
      property(picks, (chosen) => {
        const document = withPicks(chosen);
        for (const slot of featSlots(document, content)) {
          for (const offered of slot.options) {
            expect(refused(document, slot.key, offered.value)).toBe(offered.locked !== undefined);
          }
        }
      }),
      { numRuns: 30 },
    );
  }, 30_000);
});
