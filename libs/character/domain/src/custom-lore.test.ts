import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentRegistry, ContentText, Proficiency, Selector, SlotKey, Slug } from '@pioneer/rules/sdk';
import type { LoreChoice } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { Temporal } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import { buildRanks } from './class-build';
import {
  customLoreStatistics,
  loreChoiceOf,
  loreDisplayName,
  LoreName,
  loreTopicOf,
  withPickedLore,
} from './custom-lore';
import { skillSlots } from './skill-training';
import { skillReads, slotContent, slotRefusal } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, skillFixtures } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(skillFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const FIRST = SlotKey.parse('skill-training:1:0');
const SECOND = SlotKey.parse('skill-training:1:1');

function fighter(): CharacterBuilder {
  return new CharacterBuilder()
    .named('fighter')
    .picking('class', playerCoreClassId('fighter'))
    .picking('boost:1:class:0', 'dex');
}

/** The pick of the Lore a name types. */
function choice(name: string): LoreChoice {
  const typed = Slug.parse(topic(name));
  return loreChoiceOf(typed);
}

function picked(document: CharacterDocument, slot: SlotKey, name: string): CharacterDocument {
  const selection = choice(name);
  const named = withPickedLore(document, { selection, loreName: LoreName.parse(name) });
  return { ...named, build: { ...named.build, choices: { ...named.build.choices, [slot]: selection } } };
}

/** The topic a typed name comes to. */
function topic(name: string): string | undefined {
  return loreTopicOf(LoreName.parse(name));
}

describe('loreTopicOf', () => {
  test('names a Lore by its topic, less the word Lore', () => {
    expect(topic('Sailing')).toBe('sailing');
    expect(topic('Sailing Lore')).toBe('sailing');
    expect(topic('  sailing LORE ')).toBe('sailing');
    expect(topic('Pathfinder Society')).toBe('pathfinder-society');
  });

  test('folds accents and punctuation', () => {
    expect(topic('Ship’s Navigátor')).toBe('ship-s-navigator');
  });

  test('refuses a name with no letters or digits', () => {
    expect(topic('!!!')).toBeUndefined();
    expect(topic('海')).toBeUndefined();
  });

  test('refuses a name whose topic is too long once compatibility characters expand', () => {
    expect(topic('ﬃ'.repeat(30))).toBeUndefined();
    expect(topic('ﬃ'.repeat(10))).toBe('ffi'.repeat(10));
  });

  test('shows Lore after the name once', () => {
    const typed = [LoreName.parse('Sailing'), LoreName.parse('Sailing Lore')];
    expect(typed.map((name) => String(loreDisplayName(name)))).toEqual(['Sailing Lore', 'Sailing Lore']);
  });
});

describe('a custom Lore in a trained skill slot', () => {
  const none = fighter().build().document;

  test('is accepted by name, and trains the Lore', () => {
    const pick = { slot: FIRST, selection: choice('Sailing'), loreName: LoreName.parse('Sailing') };
    expect(slotRefusal(none, content, pick)).toBeUndefined();
    const document = picked(none, FIRST, 'Sailing');
    expect(buildRanks(document, content).get(Selector.parse('skill:lore:sailing'))).toBe(Proficiency.Trained);
  });

  test('is one skill however it is typed: the second training is refused as already trained', () => {
    const document = picked(none, FIRST, 'Sailing');
    const again = {
      slot: SECOND,
      selection: choice('sailing lore'),
      loreName: LoreName.parse('sailing lore'),
    };
    expect(slotRefusal(document, content, again)?.message.key).toBe('character.validation.skillTrained');
  });

  test('is on offer in the slots after, until trained', () => {
    const document = picked(none, FIRST, 'Sailing');
    const [first, second] = skillSlots(document, skillReads(document, content));
    expect(String(first?.pick?.name)).toBe('Sailing Lore');
    expect(second?.options.map(({ name }) => name)).not.toContain('Sailing Lore');
  });

  test('is read by its topic when no name was kept for it', () => {
    const document = {
      ...none,
      build: { ...none.build, choices: { ...none.build.choices, [FIRST]: ChoiceValue.parse('lore:harbour-law') } },
    };
    expect(skillSlots(document, skillReads(document, content))[0]?.pick?.name).toEqual(
      ContentText.parse('Harbour law Lore'),
    );
  });

  test('is refused where a skill increase cannot reach it', () => {
    const pick = { slot: SlotKey.parse('skill-increase:3'), selection: choice('Sailing') };
    expect(slotRefusal(none, content, pick)).toBeUndefined();
    const trained = picked(none, FIRST, 'Sailing');
    expect(slotRefusal(trained, content, pick)).toBeUndefined();
  });
});

describe('customLoreStatistics', () => {
  const document = picked(fighter().build().document, FIRST, 'Sailing');
  const loaded = registry.statistics().map(({ definition }) => definition);

  test('derives the Lore like a loaded one: Intelligence, skill-check and lore', () => {
    const [sailing] = customLoreStatistics(document, loaded);
    expect(sailing).toMatchObject({
      selector: 'skill:lore:sailing',
      name: 'Sailing Lore',
      keyAttribute: 'int',
      domains: ['check', 'skill-check', 'int-based', 'lore'],
      base: '@attr.int + @prof.skill.lore.sailing',
    });
  });

  test('leaves out a Lore a loaded statistic has the selector of', () => {
    const scribing = picked(fighter().build().document, FIRST, 'Scribing');
    expect(customLoreStatistics(scribing, loaded)).toEqual([]);
  });

  test('a pick of a loaded Lore topic names the loaded statistic', () => {
    const scribing = picked(fighter().build().document, FIRST, 'Scribing');
    const pick = skillSlots(scribing, skillReads(scribing, content))[0]?.pick;
    expect(pick).toMatchObject({ name: 'Scribing Lore', selector: 'skill:lore:scribing' });
    expect(String(pick?.id)).not.toBe('lore:scribing');
  });
});

describe('editing a Lore pick', () => {
  const now = Temporal.Instant.from('2026-01-01T00:00:00Z');
  const character = fighter().build();

  test('a selection with a name keeps the name on the character', () => {
    const next = character.apply(
      {
        field: CharacterPatchField.SelectSlot,
        slot: FIRST,
        selection: choice('Sailing'),
        loreName: LoreName.parse('Sailing'),
      },
      now,
    );
    expect(Object.entries(next.document.build.lores).map(([key, name]) => `${key}=${name}`)).toEqual([
      'sailing=Sailing',
    ]);
    expect(String(next.document.build.choices[FIRST])).toBe('lore:sailing');
  });

  test('changing the pick drops the name of the Lore it no longer picks', () => {
    const named = character.apply(
      {
        field: CharacterPatchField.SelectSlot,
        slot: FIRST,
        selection: choice('Sailing'),
        loreName: LoreName.parse('Sailing'),
      },
      now,
    );
    const cleared = named.apply({ field: CharacterPatchField.ClearSlot, slot: FIRST }, now);
    expect(cleared.document.build.lores).toEqual({});
  });
});
