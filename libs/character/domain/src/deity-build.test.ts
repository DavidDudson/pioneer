import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, RuleSlug, Selector } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterDeity } from './character-deity';
import type { SheetDeity } from './character-deity';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { DEITY_SLOT } from './character-slots';
import { buildRanks, characterGrants } from './class-build';
import { deityContent } from './deity-content';
import { favoredWeapons } from './favored-weapons';
import { slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId } from './testing';
import type { PlayerCoreClass } from './testing';

const deities = new ContentPackBuilder()
  .withId('deities')
  .withDeity('sarenrae', {
    sanctification: { modal: 'can', what: ['holy'] },
    font: ['heal'],
    skills: ['skill:medicine'],
    weapons: ['scimitar'],
  })
  .withDeity('shelyn', { font: ['heal'], skills: ['skill:crafting', 'skill:performance'] })
  .withDeity('zon-kuthon', { sanctification: { modal: 'must', what: ['unholy'] }, font: ['harm'] })
  .withDeity('pharasma', { font: ['heal'] })
  .withItem(ContentKind.Weapon, 'scimitar', {
    baseItem: 'scimitar',
    category: 'martial',
    group: 'sword',
    damage: { dice: 1, die: 'd6', damageType: 'slashing' },
    bulk: 1,
    usage: { type: 'held', hands: 'one' },
  });
const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(deities.build());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const SARENRAE = ContentId.parse(deities.idOf(ContentKind.Deity, 'sarenrae'));
const ZON_KUTHON = ContentId.parse(deities.idOf(ContentKind.Deity, 'zon-kuthon'));
const PHARASMA = ContentId.parse(deities.idOf(ContentKind.Deity, 'pharasma'));
const SHELYN = ContentId.parse(deities.idOf(ContentKind.Deity, 'shelyn'));

function level1(name: PlayerCoreClass, deity?: ContentId): CharacterBuilder {
  const builder = new CharacterBuilder()
    .named(name)
    .picking('class', playerCoreClassId(name))
    .picking('boost:1:class:0', 'wis');
  return deity === undefined ? builder : builder.picking(String(DEITY_SLOT), deity);
}

/** The values a cleric's `ChoiceSet` under `flag` offers. */
function offered(name: PlayerCoreClass, deity: ContentId | undefined, flag: string): readonly string[] | undefined {
  const { document } = level1(name, deity).build();
  const slot = characterGrants(document, content).open.find((each) => each.flag === RuleSlug.parse(flag));
  return slot?.options.map((option) => String(option.value));
}

describe('the deity slot', () => {
  test("is a fighter's to leave empty, so it is not listed until a deity is picked", () => {
    const empty = characterSlots(level1('fighter').build().document, content);
    const picked = characterSlots(level1('fighter', SARENRAE).build().document, content);

    expect(empty.some((slot) => slot.key === DEITY_SLOT)).toBe(false);
    expect(picked.find((slot) => slot.key === DEITY_SLOT)).toMatchObject({
      status: SlotStatus.Filled,
      selectionName: 'Sarenrae',
    });
  });

  test('is listed open for a cleric, whose Deity feature needs one', () => {
    const slots = characterSlots(level1('cleric').build().document, content);

    expect(slots.find((slot) => slot.key === DEITY_SLOT)?.status).toBe(SlotStatus.Open);
  });

  test('picked, the deity is on the character with what it says of its follower', () => {
    const { rollOptions } = characterGrants(level1('fighter', SARENRAE).build().document, content);

    const deityOptions = rollOptions.map(String).filter((option) => option.startsWith('deity:'));

    expect(deityOptions.toSorted()).toEqual([
      'deity:primary:favored-weapon:scimitar',
      'deity:primary:font:heal',
      'deity:primary:sanctification:can:holy',
      'deity:primary:sarenrae',
      'deity:primary:skill:medicine',
    ]);
  });
});

/** A fighter's deity as the sheet reads it. */
function deityOf(deity?: ContentId): SheetDeity | undefined {
  return characterDeity(level1('fighter', deity).build().document, content, deityContent(registry));
}

describe('the deity on the sheet', () => {
  test('is the picked deity, its favoured weapons named by the loaded weapon of their base', () => {
    expect(deityOf(SARENRAE)).toMatchObject({
      id: SARENRAE,
      name: 'Sarenrae',
      favoredWeapons: [{ weapon: 'scimitar', name: 'Scimitar' }],
    });
  });

  test('is absent without a pick', () => {
    expect(deityOf()).toBeUndefined();
  });
});

describe("a cleric's divine font and sanctification", () => {
  test('offer nothing until the cleric has a deity', () => {
    expect(offered('cleric', undefined, 'divine-font')).toEqual([]);
    expect(offered('cleric', undefined, 'sanctification')).toEqual(['none']);
  });

  test("offer the deity's fonts, and holy or none when it can be holy", () => {
    expect(offered('cleric', SARENRAE, 'divine-font')).toEqual(['heal']);
    expect(offered('cleric', SARENRAE, 'sanctification')).toEqual(['holy', 'none']);
  });

  test('offer only unholy when the deity must be unholy', () => {
    expect(offered('cleric', ZON_KUTHON, 'divine-font')).toEqual(['harm']);
    expect(offered('cleric', ZON_KUTHON, 'sanctification')).toEqual(['unholy']);
  });

  test('offer only none when the deity has no sanctification', () => {
    expect(offered('cleric', PHARASMA, 'sanctification')).toEqual(['none']);
  });
});

/** The key of the cleric's open slot under `flag`, with `deity` picked. */
function slotKey(deity: ContentId, flag: string): string {
  const { document } = level1('cleric', deity).build();
  const slot = characterGrants(document, content).open.find((each) => each.flag === RuleSlug.parse(flag));
  return String(slot?.key);
}

describe("a cleric's divine skill", () => {
  test("is offered from the deity's divine skills, and nothing before a deity", () => {
    expect(offered('cleric', undefined, 'divine-skill')).toEqual([]);
    expect(offered('cleric', SARENRAE, 'divine-skill')).toEqual(['medicine']);
    expect(offered('cleric', SHELYN, 'divine-skill')).toEqual(['crafting', 'performance']);
  });

  test('picked, trains the cleric in it', () => {
    const skill = Selector.parse('skill:performance');
    const before = level1('cleric', SHELYN).build().document;
    const after = level1('cleric', SHELYN).picking(slotKey(SHELYN, 'divine-skill'), 'performance').build().document;

    expect(buildRanks(before, content).get(skill)).toBeUndefined();
    expect(buildRanks(after, content).get(skill)).toBe('trained');
  });

  test("is not a fighter's, who has no Deity feature", () => {
    expect(offered('fighter', SARENRAE, 'divine-skill')).toBeUndefined();
  });
});

describe("a cleric's favoured weapon", () => {
  const favored = Selector.parse('attack:favored-weapon');

  test("is trained for a cleric, whose Strikes with the deity's favoured weapons read it", () => {
    const { document } = level1('cleric', SARENRAE).build();
    expect(buildRanks(document, content).get(favored)).toBe('trained');
    expect([...favoredWeapons(characterGrants(document, content))].map(String)).toEqual(['scimitar']);
  });

  test('is no rank for a fighter, whose deity favours the weapon all the same', () => {
    const { document } = level1('fighter', SARENRAE).build();
    expect(buildRanks(document, content).get(favored)).toBeUndefined();
    expect([...favoredWeapons(characterGrants(document, content))].map(String)).toEqual(['scimitar']);
  });
});
