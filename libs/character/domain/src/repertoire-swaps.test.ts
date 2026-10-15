import { describe, expect, test } from 'bun:test';

import { ContentRegistry, Level, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import { RepertoireSwap, repertoireSwap, repertoireSwapRefusal } from './repertoire-swaps';
import { slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, spellFixtureId, spellFixtures } from './testing';
import type { SpellFixture } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(spellFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const NOW = fixedClock('2026-01-01T00:00:00Z').now();
const FIRST = 'repertoire:bard:1:0';
const SECOND = 'repertoire:bard:1:1';
/** A 3rd-rank slot, which a bard first has at 5th level. */
const NEW_THIRD = 'repertoire:bard:3:0';

const slot = (key: string): SlotKey => SlotKey.parse(key);
const spell = (name: SpellFixture): string => spellFixtureId(name);

/** A 5th-level bard with `picks`, and `swaps` its level or others recorded. */
function bard(
  picks: Readonly<Record<string, SpellFixture>>,
  swaps: Readonly<Record<number, string>> = {},
): CharacterDocument {
  let builder = new CharacterBuilder()
    .named('bard')
    .picking('class', playerCoreClassId('bard'))
    .picking('boost:1:class:0', 'cha')
    .atLevel(5);
  for (const [key, name] of Object.entries(picks)) {
    builder = builder.picking(key, spellFixtureId(name));
  }
  const character = builder.build();
  const repertoireSwaps = Object.entries(swaps).map(([level, key]) => ({
    level: Level.parse(Number(level)),
    slot: slot(key),
  }));
  return { ...character.document, build: { ...character.document.build, repertoireSwaps } };
}

describe('repertoire swaps', () => {
  test('filling an empty slot is free', () => {
    expect(repertoireSwap(bard({}), content, { slot: slot(FIRST), selection: spell('force-barrage') })).toBe(
      RepertoireSwap.Free,
    );
  });

  test('changing a slot that opened at the character level is free, and so is keeping its pick', () => {
    const document = bard({ [NEW_THIRD]: 'fireball', [FIRST]: 'force-barrage' }, { 5: SECOND });

    expect(repertoireSwap(document, content, { slot: slot(NEW_THIRD), selection: spell('heal') })).toBe(
      RepertoireSwap.Free,
    );
    expect(repertoireSwap(document, content, { slot: slot(FIRST), selection: spell('force-barrage') })).toBe(
      RepertoireSwap.Free,
    );
  });

  test('replacing or emptying an older slot is the level swap', () => {
    const document = bard({ [FIRST]: 'force-barrage' });

    expect(repertoireSwap(document, content, { slot: slot(FIRST), selection: spell('heal') })).toBe(
      RepertoireSwap.Counts,
    );
    expect(repertoireSwap(document, content, { slot: slot(FIRST), selection: undefined })).toBe(RepertoireSwap.Counts);
  });

  test('a second slot at the same level is refused, the swapped slot may change again', () => {
    const document = bard({ [FIRST]: 'force-barrage', [SECOND]: 'heal' }, { 5: FIRST });

    expect(repertoireSwap(document, content, { slot: slot(SECOND), selection: spell('fireball') })).toBe(
      RepertoireSwap.Refused,
    );
    expect(repertoireSwap(document, content, { slot: slot(FIRST), selection: spell('fireball') })).toBe(
      RepertoireSwap.Counts,
    );
    expect(repertoireSwapRefusal(document, content, { slot: slot(SECOND) })).toMatchObject({
      field: 'slot',
      message: { key: 'character.validation.repertoireSwapUsed', params: { level: 5 } },
    });
  });

  test("a swap at another level doesn't use this one", () => {
    const document = bard({ [FIRST]: 'force-barrage', [SECOND]: 'heal' }, { 4: FIRST });

    expect(repertoireSwap(document, content, { slot: slot(SECOND), selection: spell('fireball') })).toBe(
      RepertoireSwap.Counts,
    );
  });

  test('other slots are never swaps', () => {
    expect(repertoireSwap(bard({}), content, { slot: slot('class'), selection: spell('heal') })).toBe(
      RepertoireSwap.Free,
    );
  });
});

describe('Character.apply with a swap', () => {
  test('records the swap at the level and moves the signature spell to the replacement', () => {
    const base = new CharacterBuilder()
      .named('bard')
      .picking('class', playerCoreClassId('bard'))
      .picking('boost:1:class:0', 'cha')
      .picking(FIRST, spell('force-barrage'))
      .picking('signature:bard:1', spell('force-barrage'))
      .atLevel(5)
      .build();
    const swapped = base.apply(
      { field: CharacterPatchField.SelectSlot, slot: slot(FIRST), selection: spellFixtureId('heal') },
      NOW,
      { countsAsSwap: true },
    );

    expect(swapped.document.build.choices[slot(FIRST)]).toBe(spell('heal'));
    expect(swapped.document.build.choices[slot('signature:bard:1')]).toBe(spell('heal'));
    expect(swapped.document.build.repertoireSwaps).toEqual([{ level: 5, slot: slot(FIRST) }]);
  });

  test("leaves a signature spell another slot of the rank still knows, and a free edit's record", () => {
    const base = new CharacterBuilder()
      .named('bard')
      .picking('class', playerCoreClassId('bard'))
      .picking('boost:1:class:0', 'cha')
      .picking(FIRST, spell('force-barrage'))
      .picking('signature:bard:1', spell('heal'))
      .atLevel(5)
      .build();
    const edited = base.apply(
      { field: CharacterPatchField.SelectSlot, slot: slot(FIRST), selection: spellFixtureId('fireball') },
      NOW,
    );

    expect(edited.document.build.choices[slot('signature:bard:1')]).toBe(spell('heal'));
    expect(edited.document.build.repertoireSwaps).toEqual([]);
  });

  test('emptying a slot as the swap records it', () => {
    const base = new CharacterBuilder()
      .named('bard')
      .picking('class', playerCoreClassId('bard'))
      .picking('boost:1:class:0', 'cha')
      .picking(FIRST, spell('force-barrage'))
      .atLevel(5)
      .build();
    const cleared = base.apply({ field: CharacterPatchField.ClearSlot, slot: slot(FIRST) }, NOW, {
      countsAsSwap: true,
    });

    expect(cleared.document.build.choices[slot(FIRST)]).toBeUndefined();
    expect(cleared.document.build.repertoireSwaps).toEqual([{ level: 5, slot: slot(FIRST) }]);
  });
});
