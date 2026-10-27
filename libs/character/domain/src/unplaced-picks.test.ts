import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';

import { Character } from './character';
import { CharacterPatchField } from './character-patch';
import { SlotInvalidMessage } from './character-slot';
import { HERITAGE_SLOT } from './character-slots';
import { CharacterBuilder, humanAncestryId } from './testing';
import { UnplacedPickKind, unplacedPickBreaks } from './unplaced-picks';
import type { UnplacedPicks } from './unplaced-picks';

const later = fixedClock('2026-10-07T10:00:00Z').now();
const pack = PackId.parse('player-core');
const heritage = ContentId.parse(contentId(pack, EntrySlug.parse('heritage:cavern-elf')));
const elven = ContentId.parse(contentId(pack, EntrySlug.parse('language:elven')));
const dwarven = ContentId.parse(contentId(pack, EntrySlug.parse('language:dwarven')));

/** A character carrying the heritage and languages an import found no slot for. */
function keeping(unplaced: UnplacedPicks): Character {
  const { document } = new CharacterBuilder().build();
  return Character.create({
    id: document.id,
    ownerId: document.ownerId,
    name: document.name,
    ancestry: humanAncestryId,
    unplaced,
    now: later,
  });
}

describe('unplaced heritage and languages', () => {
  test('flags a kept heritage and each kept language, with the rule each breaks', () => {
    const { document } = keeping({ unplacedHeritage: heritage, unplacedLanguages: [elven, dwarven] });
    expect(unplacedPickBreaks(document)).toStrictEqual([
      { kind: UnplacedPickKind.Heritage, pick: heritage, reason: { key: SlotInvalidMessage.NoHeritageSlot } },
      { kind: UnplacedPickKind.Language, pick: elven, reason: { key: SlotInvalidMessage.NoLanguageSlot } },
      { kind: UnplacedPickKind.Language, pick: dwarven, reason: { key: SlotInvalidMessage.NoLanguageSlot } },
    ]);
  });

  test('flags nothing for a character that kept none', () => {
    expect(unplacedPickBreaks(new CharacterBuilder().build().document)).toStrictEqual([]);
  });

  test('picking a heritage clears the flag and the kept heritage', () => {
    const next = keeping({ unplacedHeritage: heritage }).apply(
      { field: CharacterPatchField.SelectSlot, slot: HERITAGE_SLOT, selection: ChoiceValue.parse(dwarven) },
      later,
    );
    expect(next.document.build.unplacedHeritage).toBeUndefined();
    expect(unplacedPickBreaks(next.document)).toStrictEqual([]);
  });

  test('dismissing takes only the named heritage or language off the build', () => {
    const kept = keeping({ unplacedHeritage: heritage, unplacedLanguages: [elven, dwarven] });
    const noHeritage = kept.apply({ field: CharacterPatchField.DismissUnplacedHeritage, heritage }, later);
    const noElven = noHeritage.apply({ field: CharacterPatchField.DismissUnplacedLanguage, language: elven }, later);
    expect(noHeritage.document.build.unplacedHeritage).toBeUndefined();
    expect(noElven.document.build.unplacedLanguages).toStrictEqual([dwarven]);
  });

  test('dismissing a heritage that is not the kept one changes nothing', () => {
    const next = keeping({ unplacedHeritage: heritage }).apply(
      { field: CharacterPatchField.DismissUnplacedHeritage, heritage: elven },
      later,
    );
    expect(next.document.build.unplacedHeritage).toBe(heritage);
  });
});
