import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, KIND_DATA } from '@pioneer/rules/sdk';

import { dataIn, entryOfKind, gapKeys, slugIn } from './testing/build-helpers';
import { coreRulesId, translate } from './testing/import-fixtures';
import { contentEntry, FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';
import {
  BLESS_EFFECT,
  COMMAND,
  effectOfNoTime,
  FIREBALL,
  HEAL,
  MAGIC,
  RAGE_EFFECT,
  spell,
} from './testing/magic-fixtures';

const translation = translate(MAGIC);

describe('translateKindData: one fixture per magic and effect kind, translated and parsed', () => {
  test.each([
    ['fireball', ContentKind.Spell],
    ['consecrate', ContentKind.Ritual],
    ['calling', ContentKind.Ritual],
    ['warding', ContentKind.Ritual],
    ['spell-effect-bless', ContentKind.Effect],
  ] as const)('%s parses against its kind data and as a ContentEntry', (name, kind) => {
    const entry = entryOfKind(translation, kind, name);

    expect(KIND_DATA[kind].safeParse(entry?.kindData?.data).success).toBe(true);
    expect(ContentEntry.safeParse(contentEntry(entry)).error).toBeUndefined();
  });
});

describe('translateKindData: spells', () => {
  test('casting fields, defence, traditions, damage and interval heightening map', () => {
    expect(dataIn(translation, 'fireball')).toEqual({
      rank: 3,
      time: { type: 'actions', cost: 'two' },
      range: { type: 'feet', feet: 500 },
      area: { shape: 'burst', size: 20 },
      defense: { save: { statistic: 'save:reflex', basic: true } },
      traditions: ['arcane', 'primal'],
      damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
      heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '2d6' }] },
    });
  });

  test('a variable casting time, target alternatives and damage that also heals', () => {
    expect(dataIn(translation, 'heal')).toMatchObject({
      time: { type: 'actions', cost: 'one', upTo: 'three' },
      range: { type: 'touch' },
      targets: {
        any: [
          { count: 1, of: 'creature', qualifiers: ['willing', 'living'] },
          { count: 1, of: 'creature', traits: ['undead'] },
        ],
      },
      damage: [{ key: '0', formula: '1d8', damageType: 'vitality', kinds: ['damage', 'healing'] }],
    });
  });

  test("fixed heightening and an until duration of the target's turn", () => {
    expect(dataIn(translation, 'command')).toMatchObject({
      duration: { type: 'until', until: 'next-turn-end', of: 'target' },
      defense: { save: { statistic: 'save:will', basic: false } },
      heightening: { type: 'fixed', ranks: [{ rank: 5, targets: { any: [{ count: 10, of: 'creature' }] } }] },
    });
  });

  test('wording that does not map is reported and its field left out; the rest translates', () => {
    const odd = spell('oDd0000000000001', 'Odd', {
      level: { value: 2 },
      time: { value: '2' },
      range: { value: 'varies' },
      target: { value: '1 creature you know by name' },
      duration: { sustained: false, value: 'until full tribute is paid' },
      area: { type: 'hexagon', value: 5, details: 'hexes with plants' },
      overlays: { a1: { overlayType: 'override', system: { traits: { value: ['concentrate'] } } } },
    });
    const result = translate([odd]);

    expect(dataIn(result, 'odd')).toEqual({
      rank: 2,
      time: { type: 'actions', cost: 'two' },
      traditions: [],
      damage: [],
    });
    expect(gapKeys(result)).toEqual([
      'unmapped-value range.value',
      'unmapped-value area.type',
      'unmapped-value target.value',
      'unmapped-value duration',
      'unmapped-field overlays.a1.traits',
    ]);
  });

  test('an area keeps details that narrow it and drops details that restate it', () => {
    const flora = spell('fLoRa00000000001', 'Flora', {
      level: { value: 2 },
      time: { value: '3' },
      area: { type: 'burst', value: 20, details: 'all squares in a 20-foot-radius burst that contain plants' },
    });
    const storm = spell('sToRm00000000001', 'Storm', {
      level: { value: 4 },
      time: { value: '2' },
      area: { type: 'burst', value: 20, details: '20-foot-radius burst' },
    });
    const flame = spell('fLaMe00000000001', 'Flame', {
      level: { value: 2 },
      time: { value: '2' },
      area: { type: 'square', value: 5, details: '' },
    });
    const result = translate([flora, storm, flame]);
    const narrowed = 'all squares in a 20-foot-radius burst that contain plants';

    expect(dataIn(result, 'flora')).toMatchObject({
      area: { shape: 'burst', size: 20, details: [{ type: 'paragraph', content: [{ type: 'text', text: narrowed }] }] },
    });
    expect(dataIn(result, 'storm')).toEqual({
      rank: 4,
      time: { type: 'actions', cost: 'two' },
      area: { shape: 'burst', size: 20 },
      traditions: [],
      damage: [],
    });
    expect(dataIn(result, 'flame')).toMatchObject({ area: { shape: 'square', size: 5 } });
    expect(gapKeys(result)).toEqual([]);
  });

  test('a casting time that does not map leaves the spell without data', () => {
    const result = translate([
      spell('tImE000000000001', 'Timeless', { level: { value: 1 }, time: { value: 'varies' } }),
    ]);

    expect(dataIn(result, 'timeless')).toBeUndefined();
    expect(gapKeys(result)).toEqual(['unmapped-value time.value']);
  });

  test('a casting time of actions or rounds maps to a choice', () => {
    const result = translate([
      spell('eItHeR0000000001', 'Either', { level: { value: 1 }, time: { value: '2 to 2 rounds' } }),
    ]);

    expect(dataIn(result, 'either')).toMatchObject({
      time: {
        type: 'either',
        options: [
          { type: 'actions', cost: 'two' },
          { type: 'time', count: 2, unit: 'round' },
        ],
      },
    });
    expect(gapKeys(result)).toEqual([]);
  });

  test('a passive defence is `against` it; a save DC is its save selector', () => {
    const attack = spell('aTtAcK0000000001', 'Attack', {
      level: { value: 1 },
      time: { value: '2' },
      defense: { passive: { statistic: 'ac' }, save: FOUNDRY_NULL },
    });
    const dc = spell('dC00000000000001', 'Dc', {
      level: { value: 1 },
      time: { value: '2' },
      defense: { passive: { statistic: 'reflex-dc' }, save: FOUNDRY_NULL },
    });

    expect(dataIn(translate([attack]), 'attack')).toMatchObject({ defense: { against: 'ac' } });
    expect(dataIn(translate([dc]), 'dc')).toMatchObject({ defense: { against: 'save:reflex' } });
  });

  test('requirements and a cost are rich text when they are plain words, reported when they have markup', () => {
    const costly = spell('cOsT000000000001', 'Costly', {
      level: { value: 1 },
      time: { value: '2' },
      requirements: 'You have a free hand.',
      cost: { value: 'a @UUID[Compendium.pf2e.equipment-srd.Item.Diamond]' },
    });
    const result = translate([costly]);

    expect(dataIn(result, 'costly')).toMatchObject({
      requirements: [{ type: 'paragraph', content: [{ type: 'text', text: 'You have a free hand.' }] }],
    });
    expect(dataIn(result, 'costly')).not.toHaveProperty('cost');
    expect(gapKeys(result)).toContain('needs-rich-text cost.value');
  });
});

describe('translateKindData: rituals', () => {
  test('a spell with ritual data is a ritual, with its checks and casters', () => {
    expect(slugIn(translation, 'consecrate')).toBe('ritual:consecrate');
    expect(dataIn(translation, 'consecrate')).toEqual({
      rank: 2,
      time: { type: 'time', count: 3, unit: 'day' },
      range: { type: 'feet', feet: 40 },
      area: { shape: 'burst', size: 40 },
      duration: { type: 'time', count: 1, unit: 'year' },
      cost: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'rare incense and offerings worth a total value of 20 gp × the spell rank' }],
        },
      ],
      primary: { skills: ['skill:religion'], proficiency: 'expert' },
      secondary: {
        checks: [{ skills: ['skill:crafting'] }, { skills: ['skill:lore:legal', 'skill:performance'] }],
        casters: 2,
      },
    });
  });

  test('a check picked by tradition, any Lore, a Lore by topic, and a pick from the primary check', () => {
    expect(dataIn(translation, 'calling')).toMatchObject({
      primary: {
        skills: ['skill:arcana', 'skill:nature', 'skill:occultism', 'skill:religion'],
        proficiency: 'expert',
        pick: 'tradition',
      },
      secondary: {
        checks: [
          { skills: ['skill:lore', 'skill:society'] },
          { skills: ['skill:lore', 'skill:survival'], loreRelatedTo: 'the destination plane' },
          { skills: ['skill:nature', 'skill:religion'], pick: 'primary-unused' },
        ],
        casters: 2,
      },
    });
  });

  test('a check with a DC of its own and skills of different ranks', () => {
    expect(dataIn(translation, 'warding')).toMatchObject({
      primary: {
        skills: ['skill:arcana', 'skill:religion'],
        ranked: [
          { skill: 'skill:arcana', proficiency: 'master' },
          { skill: 'skill:religion', proficiency: 'expert' },
        ],
        dc: 30,
      },
      secondary: { checks: [{ skills: ['skill:nature', 'skill:religion'], pick: 'primary-used' }], casters: 1 },
    });
  });

  test("a Lore a ritual checks gets its statistic, as a background's does", () => {
    expect(translation.vocabulary.map(({ envelope }) => envelope.id)).toContain(coreRulesId('statistic:legal-lore'));
  });
});

describe('translateKindData: effects', () => {
  test("an effect's category comes from its pack; its duration and counter badge carry over", () => {
    expect(dataIn(translation, 'spell-effect-bless')).toEqual({
      category: 'spell',
      duration: { type: 'time', count: 1, unit: 'minute', expiry: 'turn-start' },
      badge: { type: 'counter', value: 1, labels: ['15 ft.', '25 ft.'], loop: false },
    });
  });

  test('an unlimited duration and a rolled badge that rolls again', () => {
    expect(dataIn(translation, 'effect-rage')).toEqual({
      category: 'feat',
      duration: { type: 'unlimited' },
      badge: { type: 'formula', formula: '1d4', reevaluate: 'turn-start' },
    });
  });

  test.each(['turn-start', 'turn-end'])('a duration of no time that ends at %s is a turn', (expiry) => {
    const turn = effectOfNoTime(expiry);

    expect(dataIn(translate([turn]), 'spell-effect-bless')).toMatchObject({ duration: { type: 'turn', expiry } });
    expect(gapKeys(translate([turn]))).toEqual([]);
  });

  test.each(['campaign-effects', 'bestiary-effects'])('a %s effect is an other effect', (name) => {
    const other = { ...RAGE_EFFECT, pack: { name, directory: name } };

    expect(dataIn(translate([other]), 'effect-rage')).toMatchObject({ category: 'other' });
    expect(gapKeys(translate([other]))).toEqual([]);
  });

  test('a duration of no time with no turn to end at is reported, as is a pack with no category', () => {
    const unknown = { ...RAGE_EFFECT, pack: { name: 'mystery-effects', directory: 'mystery-effects' } };
    const roundEnd = translate([effectOfNoTime('round-end')]);
    const unset = translate([effectOfNoTime(FOUNDRY_NULL)]);

    expect(dataIn(roundEnd, 'spell-effect-bless')).toBeUndefined();
    expect(gapKeys(unset)).toEqual(['unmapped-value duration']);
    expect(gapKeys(translate([unknown]))).toEqual(['unmapped-value category']);
  });
});

describe('translateKindData: magic and effect fixtures', () => {
  test('the fixtures translate with no gaps', () => {
    expect(gapsOf(translate([FIREBALL, HEAL, COMMAND, BLESS_EFFECT, RAGE_EFFECT]))).toEqual([]);
  });
});
