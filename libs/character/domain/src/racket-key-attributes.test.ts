import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { Attribute } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { boostSets, BoostSource } from './attribute-boosts';
import type { BoostSet } from './attribute-boosts';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { characterGrants, classContent, classInputs, subclassSlot } from './class-build';
import { slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, playerCoreId } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const classes = classContent(registry);

const KEY_ATTRIBUTE = SlotKey.parse('boost:1:class:0');

function rogue(): CharacterBuilder {
  return new CharacterBuilder().named('Rogue').picking('class', playerCoreClassId('rogue'));
}

const racketSlot = subclassSlot(characterGrants(rogue().build().document, content), content.lookup, classes);
const RACKET = SlotKey.parse(String(racketSlot?.key));

function racket(name: string): string {
  return playerCoreId(ContentKind.ClassFeature, name);
}

function classSet(builder: CharacterBuilder): BoostSet | undefined {
  return boostSets(builder.build().document, content.boosts).find((set) => set.source === BoostSource.Class);
}

describe("a rogue's racket and the key attribute", () => {
  test('a rogue keys off Dexterity alone until a racket widens it', () => {
    expect(racketSlot).toBeDefined();
    expect(classSet(rogue())).toMatchObject({ fixed: ['dex'], slots: [] });
    const thief = rogue().picking(RACKET, racket('thief'));
    expect(classSet(thief)).toMatchObject({ fixed: ['dex'], slots: [] });
  });

  test.each<[string, Attribute]>([
    ['ruffian', 'str'],
    ['mastermind', 'int'],
    ['scoundrel', 'cha'],
  ])('%s adds %s to the key attribute slot', (name, added) => {
    const set = classSet(rogue().picking(RACKET, racket(name)));

    expect(set?.fixed).toEqual([]);
    expect(set?.slots.map((slot) => slot.key)).toEqual([KEY_ATTRIBUTE]);
    expect(set?.slots[0]?.options).toEqual(['dex', added]);
  });

  test('a key attribute picked before the racket counts once the racket offers it', () => {
    const { document } = rogue().picking(KEY_ATTRIBUTE, 'str').picking(RACKET, racket('ruffian')).build();

    expect(classInputs(document, content, classes)?.keyAttribute).toBe('str');
    expect(characterSlots(document, content).find((slot) => slot.key === KEY_ATTRIBUTE)?.status).toBe(
      SlotStatus.Filled,
    );
  });

  test('another racket leaves a pick it does not offer invalid, kept but counting for nothing', () => {
    const mastermind = rogue().picking(KEY_ATTRIBUTE, 'str').picking(RACKET, racket('mastermind'));
    const { document } = mastermind.build();

    expect(classSet(mastermind)?.slots[0]?.pick).toBeUndefined();
    expect(classInputs(document, content, classes)).toBeUndefined();
    expect(characterSlots(document, content).find((slot) => slot.key === KEY_ATTRIBUTE)?.status).toBe(
      SlotStatus.Invalid,
    );
    expect(String(document.build.choices[KEY_ATTRIBUTE])).toBe('str');
  });
});
