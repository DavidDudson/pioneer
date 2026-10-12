import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, RuleSlug } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterDeity } from './character-deity';
import type { SheetDeity } from './character-deity';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { DEITY_SLOT } from './character-slots';
import { characterGrants } from './class-build';
import { deityContent } from './deity-content';
import { slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId } from './testing';
import type { PlayerCoreClass } from './testing';

const deities = new ContentPackBuilder()
  .withId('deities')
  .withDeity('sarenrae', { sanctification: { modal: 'can', what: ['holy'] }, font: ['heal'], weapons: ['scimitar'] })
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
