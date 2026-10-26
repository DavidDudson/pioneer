import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentId, contentId, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';

import { Character } from './character';
import { CharacterPatchField } from './character-patch';
import { SlotInvalidMessage } from './character-slot';
import { CharacterBuilder, humanAncestryId } from './testing';
import { unplacedFeatBreaks } from './unplaced-feats';

const later = fixedClock('2026-10-07T10:00:00Z').now();
const pack = PackId.parse('player-core');
const nimble = ContentId.parse(contentId(pack, EntrySlug.parse('feat:nimble-dodge')));
const toughness = ContentId.parse(contentId(pack, EntrySlug.parse('feat:toughness')));
const slot = SlotKey.parse('feat:class:2');

/** A character carrying the feats an import found no slot for. */
function keeping(...feats: (typeof nimble)[]): Character {
  const { document } = new CharacterBuilder().build();
  return Character.create({
    id: document.id,
    ownerId: document.ownerId,
    name: document.name,
    ancestry: humanAncestryId,
    unplaced: { unplacedFeats: feats },
    now: later,
  });
}

describe('unplaced feats', () => {
  test('a character keeps the feats it is created with and flags each as a rule break', () => {
    const character = keeping(nimble, toughness);
    expect(character.document.build.unplacedFeats).toStrictEqual([nimble, toughness]);
    expect(unplacedFeatBreaks(character.document)).toStrictEqual([
      { feat: nimble, reason: { key: SlotInvalidMessage.NoSlot } },
      { feat: toughness, reason: { key: SlotInvalidMessage.NoSlot } },
    ]);
  });

  test('a character with none flags nothing', () => {
    expect(unplacedFeatBreaks(new CharacterBuilder().build().document)).toStrictEqual([]);
  });

  test('dismissing a feat takes it off the list and leaves the rest', () => {
    const next = keeping(nimble, toughness).apply(
      { field: CharacterPatchField.DismissUnplacedFeat, feat: nimble },
      later,
    );
    expect(next.document.build.unplacedFeats).toStrictEqual([toughness]);
  });

  test('dismissing a feat not on the list changes nothing', () => {
    const next = keeping(toughness).apply({ field: CharacterPatchField.DismissUnplacedFeat, feat: nimble }, later);
    expect(next.document.build.unplacedFeats).toStrictEqual([toughness]);
  });

  test('picking the feat in a slot takes it off the list, so the move into a slot clears the flag', () => {
    const next = keeping(nimble, toughness).apply(
      { field: CharacterPatchField.SelectSlot, slot, selection: ChoiceValue.parse(nimble) },
      later,
    );
    expect(next.document.build.choices[slot]).toBe(nimble);
    expect(unplacedFeatBreaks(next.document).map(({ feat }) => feat)).toStrictEqual([toughness]);
  });

  test('a feat a slot already holds is never flagged, even if the list still names it', () => {
    const { document } = keeping(nimble);
    const picked = {
      ...document,
      build: { ...document.build, choices: { ...document.build.choices, [slot]: nimble } },
    };
    expect(unplacedFeatBreaks(picked)).toStrictEqual([]);
  });
});
