import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentPack, ContentRegistry, SlotKey, SpellRank } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { characterGrants, classContent, subclassSlot } from './class-build';
import { preparedSlots } from './prepared-spells';
import type { PreparedSlot } from './prepared-spells';
import { preparedReads, slotContent, slotRefusal } from './slot-offer';
import type { SlotPick } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, playerCoreId } from './testing';
import type { PlayerCoreClass } from './testing';

/**
 * The Player Core class fixtures with a few of the book's spells beside them, under the book's ids, since the divine
 * font's and the curricula's `PoolSpells` name them so: heal and harm; Battle Magic's cantrips Shield and Telekinetic
 * Projectile and its Force Barrage and Fireball; Mentalism's uncommon Mind Reading; and Daze and Sleep, of no
 * Battle Magic curriculum.
 */
function playerCoreWithSpells(): ContentPack {
  const classes = playerCoreClasses();
  const spells = new ContentPackBuilder()
    .withId('player-core')
    .withSpell('heal', { rank: 1, traditions: ['divine', 'primal'] })
    .withSpell('harm', { rank: 1, traditions: ['divine'] })
    .withSpell('shield', { rank: 1, traditions: ['arcane', 'divine', 'occult'], traits: ['cantrip'] })
    .withSpell('telekinetic-projectile', { rank: 1, traditions: ['arcane', 'occult'], traits: ['cantrip'] })
    .withSpell('daze', { rank: 1, traditions: ['arcane', 'divine', 'occult'], traits: ['cantrip'] })
    .withSpell('force-barrage', { rank: 1, traditions: ['arcane', 'occult'] })
    .withSpell('sleep', { rank: 1, traditions: ['arcane', 'occult'] })
    .withSpell('fireball', { rank: 3, traditions: ['arcane', 'primal'] })
    .withSpell('mind-reading', { rank: 3, traditions: ['arcane', 'occult'], rarity: 'uncommon' })
    .build();
  return ContentPack.define({
    manifest: classes.manifest,
    ancestries: classes.ancestries,
    creatures: [],
    statistics: [],
    rollOptionNamespaces: {},
    otherEntries: [...classes.otherEntries, ...spells.otherEntries],
  });
}

const registry = new ContentRegistry();
registry.register(playerCoreWithSpells());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const classes = classContent(registry);

const KEY_ATTRIBUTE = 'boost:1:class:0';
/** Divine Font's `ChoiceSet` is its first rule. */
const FONT_SLOT = `${playerCoreId(ContentKind.ClassFeature, 'divine-font')}:0`;

function caster(name: PlayerCoreClass, level: number): CharacterBuilder {
  return new CharacterBuilder()
    .named(name)
    .picking('class', playerCoreClassId(name))
    .picking(KEY_ATTRIBUTE, 'str')
    .atLevel(level);
}

/** A `name` at `level` with its class's subclass option `option` picked. */
function subclassed(name: PlayerCoreClass, level: number, option: string): CharacterBuilder {
  const builder = caster(name, level);
  const slot = subclassSlot(characterGrants(builder.build().document, content), content.lookup, classes);
  return builder.picking(String(slot?.key), playerCoreId(ContentKind.ClassFeature, option));
}

/** A cleric at `level` with the font `font` picked, or none. */
function cleric(level: number, font?: 'heal' | 'harm'): CharacterBuilder {
  const builder = caster('cleric', level);
  return font === undefined ? builder : builder.picking(FONT_SLOT, font);
}

function spellId(name: string): ContentId {
  return playerCoreId(ContentKind.Spell, name);
}

function slotsOf(document: CharacterDocument): PreparedSlot[] {
  return preparedSlots(document, preparedReads(document, content));
}

function slotOf(document: CharacterDocument, key: string): PreparedSlot | undefined {
  return slotsOf(document).find((slot) => slot.key === SlotKey.parse(key));
}

/** The names of the spells a slot offers. */
function offered(document: CharacterDocument, key: string): string[] {
  return (slotOf(document, key)?.options ?? []).map((spell) => spell.name);
}

/** A pick of Sleep, a spell of no Battle Magic curriculum, for `slot`. */
function sleepIn(slot: string): SlotPick {
  return { slot: SlotKey.parse(slot), selection: spellId('sleep') };
}

describe('preparedSlots: divine font', () => {
  test("a cleric's font slots come after its own, at its highest rank, keyed by pool", () => {
    const keys = slotsOf(cleric(7, 'heal').build().document).map((slot) => String(slot.key));

    expect(keys.filter((key) => key.includes('divine-font'))).toStrictEqual([
      'prepared:cleric:divine-font:4:0',
      'prepared:cleric:divine-font:4:1',
      'prepared:cleric:divine-font:4:2',
      'prepared:cleric:divine-font:4:3',
      'prepared:cleric:divine-font:4:4',
    ]);
    expect(keys.at(-6)).toBe('prepared:cleric:4:1');
    expect<string | undefined>(
      slotOf(cleric(7, 'heal').build().document, 'prepared:cleric:divine-font:4:0')?.pool?.slug,
    ).toBe('divine-font');
  });

  test.each([
    ['heal', 'Heal'],
    ['harm', 'Harm'],
  ] as const)('a %s font offers only %s, heightened to the slot', (font, name) => {
    const { document } = cleric(7, font).build();

    expect(offered(document, 'prepared:cleric:divine-font:4:0')).toStrictEqual([name]);
    expect(slotOf(document, 'prepared:cleric:divine-font:4:0')?.castRank).toBe(SpellRank.parse(4));
  });

  test('a cleric with no font picked yet has font slots that offer nothing', () => {
    expect(offered(cleric(7).build().document, 'prepared:cleric:divine-font:4:0')).toStrictEqual([]);
  });

  test('the font choice offers both fonts whatever the deity', () => {
    const { document } = cleric(1).build();
    const font = characterSlots(document, content).find((slot) => slot.key === SlotKey.parse(FONT_SLOT));

    expect(font?.status).toBe(SlotStatus.Open);
  });

  test('a font slot refuses the other font, and its pick reads invalid once the font changes', () => {
    const healing = cleric(1, 'heal').picking('prepared:cleric:divine-font:1:0', spellId('heal')).build().document;
    const pick: SlotPick = { slot: SlotKey.parse('prepared:cleric:divine-font:1:0'), selection: spellId('harm') };
    const harmful = {
      ...healing,
      build: { ...healing.build, choices: { ...healing.build.choices, [FONT_SLOT]: 'harm' } },
    };

    expect(slotRefusal(healing, content, pick)).toMatchObject({ field: 'selection' });
    expect(slotOf(harmful, 'prepared:cleric:divine-font:1:0')?.problem).toBe('notInPool');
    expect(
      characterSlots(harmful, content).find((slot) => slot.key === SlotKey.parse('prepared:cleric:divine-font:1:0'))
        ?.status,
    ).toBe(SlotStatus.Invalid);
  });
});

describe('preparedSlots: curriculum', () => {
  test("a curriculum cantrip slot offers only the school's cantrips; the wizard's own offer every arcane one", () => {
    const { document } = subclassed('wizard', 5, 'school-of-battle-magic').build();

    expect(offered(document, 'prepared:wizard:curriculum:cantrip:0')).toStrictEqual([
      'Shield',
      'Telekinetic-projectile',
    ]);
    expect(offered(document, 'prepared:wizard:cantrip:0')).toStrictEqual(['Daze', 'Shield', 'Telekinetic-projectile']);
  });

  test("a curriculum slot offers the school's spells of its rank or lower, heightened", () => {
    const { document } = subclassed('wizard', 5, 'school-of-battle-magic').build();

    expect(offered(document, 'prepared:wizard:curriculum:1:0')).toStrictEqual(['Force-barrage']);
    expect(offered(document, 'prepared:wizard:curriculum:3:0')).toStrictEqual(['Fireball', 'Force-barrage']);
  });

  test('a curriculum slot offers an uncommon curriculum spell with no access listed', () => {
    const { document } = subclassed('wizard', 5, 'school-of-mentalism').build();

    expect(offered(document, 'prepared:wizard:curriculum:3:0')).toStrictEqual(['Mind-reading', 'Sleep']);
    expect(offered(document, 'prepared:wizard:3:0')).not.toContain('Mind-reading');
  });

  test('a curriculum slot refuses a spell of no curriculum the wizard could prepare in its own slots', () => {
    const { document } = subclassed('wizard', 5, 'school-of-battle-magic').build();

    expect(slotRefusal(document, content, sleepIn('prepared:wizard:curriculum:1:0'))).toMatchObject({
      field: 'selection',
    });
    expect(slotRefusal(document, content, sleepIn('prepared:wizard:1:0'))).toBeUndefined();
  });

  test('a wizard of Unified Magical Theory has no curriculum slots', () => {
    const keys = slotsOf(subclassed('wizard', 5, 'school-of-unified-magical-theory').build().document).map((slot) =>
      String(slot.key),
    );

    expect(keys.some((key) => key.includes('curriculum'))).toBe(false);
  });
});
