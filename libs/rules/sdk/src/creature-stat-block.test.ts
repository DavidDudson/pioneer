import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, EntrySlug, PackId } from './content-id';
import { RulesMessage } from './messages';

const text = (value: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text: value }] }];
const SPELL = contentId(PackId.parse('player-core'), EntrySlug.parse('spell:fireball'));
const ITEM = contentId(PackId.parse('player-core'), EntrySlug.parse('weapon:longsword'));

const core = {
  role: 'monster',
  size: 'medium',
  perception: 14,
  attributes: { str: 4, dex: 1, con: 3, int: -2, wis: 2, cha: 0 },
  armorClass: 24,
  saves: { fortitude: 17, reflex: 12, will: 14 },
  hitPoints: 95,
  immunities: [],
  weaknesses: [],
  resistances: [],
  speed: 25,
};

const statBlock = {
  skills: [
    { skill: 'athletics', modifier: 15 },
    { skill: 'warfare-lore', modifier: 9, note: text('+11 in battle') },
  ],
  senses: [{ sense: 'darkvision' }, { sense: 'scent', acuity: 'imprecise', range: 30 }],
  languages: ['common', 'orcish'],
  speeds: [{ movement: 'climb', speed: 20 }],
  strikes: [
    {
      name: 'Greataxe',
      range: 'melee',
      bonus: 17,
      damage: [
        { dice: 1, die: 'd12', bonus: 7, damageType: 'slashing' },
        { dice: 1, die: 'd6', damageType: 'fire' },
      ],
      traits: ['sweep'],
      reach: 10,
      effects: text('plus Grab'),
    },
  ],
  abilities: [
    { name: 'Darkvision', traits: [], description: text('Sees in the dark.'), rules: [] },
    {
      name: 'Retaliate',
      cost: 'reaction',
      trigger: text('A creature hits it.'),
      frequency: { max: 1, per: 'round' },
      traits: [],
      description: text('Strikes back.'),
      rules: [],
    },
  ],
  spellcasting: [
    {
      name: 'Primal Innate Spells',
      tradition: 'primal',
      preparation: 'innate',
      dc: 25,
      attack: 17,
      spells: [
        { spell: SPELL, rank: 3, uses: 2 },
        { spell: SPELL, rank: 1, constant: true },
      ],
    },
  ],
  items: [{ item: ITEM, quantity: 2 }],
  conditions: ['off-guard'],
  recallKnowledge: text('Identify with Nature (DC 25).'),
};

function creature(data: object): unknown {
  return {
    id: contentId(PackId.parse('monster-core'), EntrySlug.parse('creature:ogre')),
    pack: 'monster-core',
    kind: 'creature',
    slug: 'creature:ogre',
    name: 'Ogre',
    level: 3,
    rarity: 'common',
    traits: ['giant'],
    sources: [{ kind: 'book', book: 'monster-core', page: 1 }],
    description: text('Big.'),
    rules: [],
    data,
  };
}

interface PathIssue {
  readonly path: readonly PropertyKey[];
}

function issuesOf(data: object): readonly PathIssue[] {
  const result = ContentEntry.safeParse(creature(data));
  return result.success ? [] : fieldIssues(result.error.issues);
}

describe('creature stat block', () => {
  test('a creature with only the core numbers is valid', () => {
    expect(issuesOf(core)).toStrictEqual([]);
  });

  test('takes skills, senses, strikes, abilities, spellcasting and items', () => {
    expect(issuesOf({ ...core, ...statBlock })).toStrictEqual([]);
  });

  test('round-trips through the schema unchanged', () => {
    const entry = creature({ ...core, ...statBlock });
    const parsed = ContentEntry.parse(entry);

    const copy = structuredClone(parsed);

    expect(ContentEntry.parse(copy)).toStrictEqual(parsed);
    expect(parsed).toMatchObject({ data: { strikes: statBlock.strikes, skills: statBlock.skills } });
  });

  test('refuses a reaction with no trigger', () => {
    const { trigger: _trigger, ...reaction } = statBlock.abilities[1] as Record<string, unknown>;
    const issues = ContentEntry.safeParse(creature({ ...core, abilities: [reaction] }));

    expect(issues.success).toBe(false);
    expect(JSON.stringify(issues.error?.issues)).toContain(RulesMessage.ActionReactionTrigger);
  });

  test('refuses unknown fields on a strike and a spell rank above 10', () => {
    expect(issuesOf({ ...core, strikes: [{ ...statBlock.strikes[0], extra: 1 }] })).not.toStrictEqual([]);
    expect(
      issuesOf({ ...core, spellcasting: [{ ...statBlock.spellcasting[0], spells: [{ spell: SPELL, rank: 11 }] }] }),
    ).not.toStrictEqual([]);
  });
});

describe('creature attributes', () => {
  test('run to +12 for an ancient dragon, past a character’s +7', () => {
    expect(issuesOf({ ...core, attributes: { ...core.attributes, str: 12 } })).toStrictEqual([]);
    expect(issuesOf({ ...core, attributes: { ...core.attributes, str: 16 } })).not.toStrictEqual([]);
  });
});

describe('creature role', () => {
  test('takes monster and NPC details only on an NPC', () => {
    const npc = { ancestry: 'human', occupation: 'Guard', levelRange: { min: 1, max: 3 }, classHints: ['fighter'] };

    expect(issuesOf({ ...core, role: 'npc', npc })).toStrictEqual([]);
    expect(issuesOf({ ...core, role: 'monster', npc })).not.toStrictEqual([]);
  });

  test('refuses a level range that runs backwards', () => {
    expect(issuesOf({ ...core, role: 'npc', npc: { levelRange: { min: 4, max: 2 } } })).not.toStrictEqual([]);
  });

  test('needs a role', () => {
    const { role: _role, ...roleless } = core;

    expect(issuesOf(roleless)).not.toStrictEqual([]);
  });
});
