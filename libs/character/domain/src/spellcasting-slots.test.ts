import { describe, expect, test } from 'bun:test';

import type { SpellcastingInPlay, SpellSlots } from '@pioneer/rules/engine';
import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterGrants, classContent, subclassSlot } from './class-build';
import { slotContent } from './slot-offer';
import { characterSpellcasting } from './spellcasting-build';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, playerCoreId } from './testing';
import type { PlayerCoreClass } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const classes = classContent(registry);

const KEY_ATTRIBUTE = 'boost:1:class:0';

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

/** Slots as the book's tables write them: cantrips, then a count per rank from 1st up. */
function written({ cantrips, ranks }: SpellSlots): string {
  return [String(cantrips ?? 0), ranks.map(({ rank, count }) => `${rank}:${count}`).join(' ')].join(' | ');
}

function entryOf(builder: CharacterBuilder): SpellcastingInPlay | undefined {
  const [entry] = characterSpellcasting(characterGrants(builder.build().document, content));
  return entry;
}

/** The first entry's own slots as written. */
function slotsOf(builder: CharacterBuilder): string | undefined {
  const entry = entryOf(builder);
  return entry === undefined ? undefined : written(entry.slots);
}

/** The first entry's pools, each as its slug and its slots as written. */
function poolsOf(builder: CharacterBuilder): string[][] {
  return (entryOf(builder)?.pools ?? []).map((pool) => [pool.pool, written(pool)]);
}

/**
 * Player Core's spells per day, which the bard, cleric, druid, witch and wizard tables share, by level: cantrips, then
 * slots of each rank.
 */
const SPELLS_PER_DAY: readonly (readonly [number, string])[] = [
  [1, '5 | 1:2'],
  [2, '5 | 1:3'],
  [3, '5 | 1:3 2:2'],
  [4, '5 | 1:3 2:3'],
  [5, '5 | 1:3 2:3 3:2'],
  [6, '5 | 1:3 2:3 3:3'],
  [7, '5 | 1:3 2:3 3:3 4:2'],
  [8, '5 | 1:3 2:3 3:3 4:3'],
  [9, '5 | 1:3 2:3 3:3 4:3 5:2'],
  [10, '5 | 1:3 2:3 3:3 4:3 5:3'],
  [11, '5 | 1:3 2:3 3:3 4:3 5:3 6:2'],
  [12, '5 | 1:3 2:3 3:3 4:3 5:3 6:3'],
  [13, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:2'],
  [14, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:3'],
  [15, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:3 8:2'],
  [16, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:3 8:3'],
  [17, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:3 8:3 9:2'],
  [18, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:3 8:3 9:3'],
  [19, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:3 8:3 9:3 10:1'],
  [20, '5 | 1:3 2:3 3:3 4:3 5:3 6:3 7:3 8:3 9:3 10:1'],
];

const CASTERS = ['bard', 'cleric', 'druid', 'wizard'] as const;
const CASTER_TABLES = CASTERS.flatMap((name) => SPELLS_PER_DAY.map(([level, slots]) => [name, level, slots] as const));

describe('spell slots of Player Core casters', () => {
  test.each(CASTER_TABLES)('a %s at level %d has %s', (name, level, slots) => {
    expect(slotsOf(caster(name, level))).toBe(slots);
  });

  test.each(SPELLS_PER_DAY)('a witch of any patron at level %d has %s', (level, slots) => {
    expect(slotsOf(subclassed('witch', level, 'the-resentment'))).toBe(slots);
    expect(slotsOf(subclassed('witch', level, 'wilding-steward'))).toBe(slots);
  });

  test('a class without spellcasting has no entry to hold slots', () => {
    expect(entryOf(caster('fighter', 20))).toBeUndefined();
  });
});

describe('divine font', () => {
  test.each([
    [1, '0 | 1:4'],
    [4, '0 | 2:4'],
    [5, '0 | 3:5'],
    [14, '0 | 7:5'],
    [15, '0 | 8:6'],
    // The 10th-rank slot takes no abilities that give more slots.
    [19, '0 | 9:6'],
  ])('a cleric at level %d has %s divine font slots at the highest rank', (level, slots) => {
    expect(poolsOf(caster('cleric', level))).toEqual([['divine-font', slots]]);
  });
});

describe('curriculum', () => {
  test.each([
    [1, '1 | 1:1'],
    [5, '1 | 1:1 2:1 3:1'],
    [19, '1 | 1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:1'],
  ])('a wizard of a curriculum school at level %d has %s curriculum slots', (level, slots) => {
    expect(poolsOf(subclassed('wizard', level, 'school-of-battle-magic'))).toEqual([['curriculum', slots]]);
  });

  test('a wizard of Unified Magical Theory has no curriculum, nor one with no school yet', () => {
    expect(poolsOf(subclassed('wizard', 5, 'school-of-unified-magical-theory'))).toEqual([]);
    expect(poolsOf(caster('wizard', 5))).toEqual([]);
  });
});
