import { Attribute, ContentKind, contentId, PackId, Slug, StatisticKind } from '@pioneer/rules/sdk';
import type { RegisteredKind } from '@pioneer/rules/sdk';

const PLAYER_CORE = PackId.parse('player-core');
const MONSTER_CORE = PackId.parse('monster-core');

/** Examples cite page 1, like the other playground examples; the importer fills real pages. */
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };
const monsterCorePage = { kind: 'book', book: 'monster-core', page: 1 };

/* Stat block numbers: Player Core's human, Monster Core's giant rat (Foundry pf2e). */
const HUMAN_HIT_POINTS = 8;
const HUMAN_SPEED = 25;
const RAT_LEVEL = -1;
const RAT_PERCEPTION = 5;
const RAT_ARMOR_CLASS = 15;
const RAT_FORTITUDE = 6;
const RAT_REFLEX = 7;
const RAT_WILL = 3;
const RAT_HIT_POINTS = 8;
const RAT_SPEED = 30;
const RAT_STRENGTH = 1;
const RAT_DEXTERITY = 3;
const RAT_CONSTITUTION = 2;
const RAT_INTELLIGENCE = -4;
const RAT_WISDOM = 1;
const RAT_CHARISMA = -3;

const paragraph = (text: string): unknown => ({ type: 'paragraph', content: [{ type: 'text', text }] });

const human = {
  id: contentId(PLAYER_CORE, Slug.parse('human')),
  pack: PLAYER_CORE,
  kind: ContentKind.Ancestry,
  slug: 'human',
  name: 'Human',
  rarity: 'common',
  traits: ['human', 'humanoid'],
  sources: [playerCorePage],
  description: [paragraph('Humans are diverse and adaptable, with ambitions as varied as the lands they call home.')],
  rules: [],
  data: { hitPoints: HUMAN_HIT_POINTS, size: 'medium', speed: HUMAN_SPEED },
};

const giantRat = {
  id: contentId(MONSTER_CORE, Slug.parse('giant-rat')),
  pack: MONSTER_CORE,
  kind: ContentKind.Creature,
  slug: 'giant-rat',
  name: 'Giant Rat',
  level: RAT_LEVEL,
  rarity: 'common',
  traits: ['animal'],
  sources: [monsterCorePage],
  description: [paragraph('A rat the size of a dog, quick to bite and quicker to spread disease.')],
  rules: [],
  data: {
    size: 'small',
    perception: RAT_PERCEPTION,
    attributes: {
      str: RAT_STRENGTH,
      dex: RAT_DEXTERITY,
      con: RAT_CONSTITUTION,
      int: RAT_INTELLIGENCE,
      wis: RAT_WISDOM,
      cha: RAT_CHARISMA,
    },
    armorClass: RAT_ARMOR_CLASS,
    saves: { fortitude: RAT_FORTITUDE, reflex: RAT_REFLEX, will: RAT_WILL },
    hitPoints: RAT_HIT_POINTS,
    immunities: [],
    weaknesses: [],
    resistances: [],
    speed: RAT_SPEED,
  },
};

const armorClass = {
  id: contentId(PLAYER_CORE, Slug.parse('armor-class')),
  pack: PLAYER_CORE,
  kind: ContentKind.Statistic,
  slug: 'armor-class',
  name: 'Armor Class',
  rarity: 'common',
  traits: [],
  sources: [playerCorePage],
  description: [paragraph('How hard you are to hit: the DC for attack rolls against you.')],
  rules: [],
  data: {
    selector: 'ac',
    domains: ['dex-based'],
    base: '10 + @attr.dex.capped + @prof.ac',
    kind: StatisticKind.Dc,
    keyAttribute: Attribute.Dexterity,
  },
};

/** A valid entry per registered kind, for the playground's content entry mode. */
export const EXAMPLE_CONTENT_ENTRIES: Readonly<Record<RegisteredKind, unknown>> = {
  [ContentKind.Ancestry]: human,
  [ContentKind.Creature]: giantRat,
  [ContentKind.Statistic]: armorClass,
};

/** Message keys naming each registered kind, spelled out so the key check sees them. */
export const CONTENT_KIND_KEYS: Readonly<Record<RegisteredKind, string>> = {
  [ContentKind.Ancestry]: 'play.rules.contentKind.ancestry',
  [ContentKind.Creature]: 'play.rules.contentKind.creature',
  [ContentKind.Statistic]: 'play.rules.contentKind.statistic',
};
