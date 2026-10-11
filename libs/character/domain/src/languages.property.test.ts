import { describe, expect, test } from 'bun:test';

import { ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, integer, option, property } from 'fast-check';

import type { CharacterDocument } from './character-document';
import { characterLanguages } from './character-languages';
import { knownLanguages, languageSlots } from './languages';
import { languageReads, slotContent } from './slot-offer';
import {
  CharacterBuilder,
  languageBackgroundId,
  languageDwarfId,
  languageFixtureId,
  languageFixtures,
} from './testing';
import type { LanguageBackground, LanguageFixture } from './testing';

const registry = new ContentRegistry();
registry.register(languageFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const LANGUAGES: readonly LanguageFixture[] = [
  'common',
  'dwarven',
  'elven',
  'goblin',
  'draconic',
  'petran',
  'empyrean',
  'aklo',
];
const BACKGROUNDS: readonly LanguageBackground[] = ['envoy', 'linguist', 'dwarf-friend', 'scholar'];
/** A language, or nothing, for one slot. */
const languagePick = option(constantFrom(...LANGUAGES), { nil: undefined });
const PICKS_MAX = 8;
const LEVEL_MAX = 20;
const backgroundPick = option(constantFrom(...BACKGROUNDS), { nil: undefined });
const languagePicks = array(languagePick, { maxLength: PICKS_MAX });
const level = integer({ min: 1, max: LEVEL_MAX });

/** A dwarf at `atLevel` with `background`, `picks` filling its language slots in order. */
function dwarfWith(
  background: LanguageBackground | undefined,
  picks: readonly (LanguageFixture | undefined)[],
  atLevel: number,
): CharacterDocument {
  let builder = new CharacterBuilder().picking('ancestry', languageDwarfId).atLevel(atLevel);
  if (background !== undefined) {
    builder = builder.picking('background', languageBackgroundId(background));
  }
  const { document: bare } = builder.build();
  for (const [index, slot] of languageSlots(bare, languageReads(bare, content)).entries()) {
    const pick = picks[index];
    if (pick !== undefined) {
      builder = builder.picking(slot.key, languageFixtureId(pick));
    }
  }
  return builder.build().document;
}

describe('languages', () => {
  test('whatever is picked, the character knows each language once', () => {
    assert(
      property(backgroundPick, languagePicks, level, (background, picks, atLevel) => {
        const document = dwarfWith(background, picks, atLevel);
        const known = knownLanguages(document, languageReads(document, content)).map(({ language }) => language.id);

        expect(new Set(known).size).toBe(known.length);
      }),
    );
  });
});

describe('the sheet languages', () => {
  test('every slot up to the level is a counted pick or left to add, and Add language offers nothing known', () => {
    assert(
      property(backgroundPick, languagePicks, level, (background, picks, atLevel) => {
        const document = dwarfWith(background, picks, atLevel);
        const slots = languageSlots(document, languageReads(document, content)).filter((slot) => slot.level <= atLevel);
        const { known, open, next } = characterLanguages(document, content);
        const picked = slots.filter((slot) => slot.pick !== undefined).length;
        const knownIds = new Set(known.map(({ id }) => id));

        expect(open + picked).toBe(slots.length);
        expect((next?.options ?? []).filter(({ id }) => knownIds.has(id))).toEqual([]);
      }),
    );
  });
});
