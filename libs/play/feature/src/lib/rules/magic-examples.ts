import { ContentKind, contentId, PackId, Slug } from '@pioneer/rules/sdk';

const PLAYER_CORE = PackId.parse('player-core');

/** Examples cite page 1, like the other playground examples; the importer fills real pages. */
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };

const paragraph = (text: string): unknown => ({ type: 'paragraph', content: [{ type: 'text', text }] });

/** The envelope fields every Player Core example shares. */
function playerCore(slug: string, name: string, description: string): object {
  return {
    id: contentId(PLAYER_CORE, Slug.parse(slug)),
    pack: PLAYER_CORE,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [playerCorePage],
    description: [paragraph(description)],
  };
}

/* Player Core numbers (Foundry pf2e): Fireball, Consecrate and Heroism's ranks, sizes and times. */
const FIREBALL_RANK = 3;
const FIREBALL_RANGE = 500;
const FIREBALL_BURST = 20;
const CONSECRATE_RANK = 2;
const CONSECRATE_DAYS = 3;
const CONSECRATE_FEET = 40;
const CONSECRATE_CASTERS = 2;
const HEROISM_LEVEL = 3;
const HEROISM_MINUTES = 10;

export const fireball = {
  ...playerCore('fireball', 'Fireball', 'A roaring blast of fire detonates at a spot you designate.'),
  kind: ContentKind.Spell,
  traits: ['concentrate', 'fire', 'manipulate'],
  rules: [],
  data: {
    rank: FIREBALL_RANK,
    traditions: ['arcane', 'primal'],
    time: { type: 'actions', cost: 'two' },
    range: { type: 'feet', feet: FIREBALL_RANGE },
    area: { shape: 'burst', size: FIREBALL_BURST },
    defense: { save: { statistic: 'save:reflex', basic: true } },
    damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
    heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '2d6' }] },
  },
};

export const consecrate = {
  ...playerCore('consecrate', 'Consecrate', 'You enshrine an area as a holy or unholy site.'),
  kind: ContentKind.Ritual,
  rarity: 'uncommon',
  traits: ['consecration'],
  rules: [],
  data: {
    rank: CONSECRATE_RANK,
    time: { type: 'time', count: CONSECRATE_DAYS, unit: 'day' },
    cost: [paragraph('rare incense and offerings worth a total value of 20 gp × the spell rank')],
    range: { type: 'feet', feet: CONSECRATE_FEET },
    area: { shape: 'burst', size: CONSECRATE_FEET },
    duration: { type: 'time', count: 1, unit: 'year' },
    primary: { skills: ['skill:religion'] },
    secondary: {
      checks: [{ skills: ['skill:crafting'] }, { skills: ['skill:performance'] }],
      casters: CONSECRATE_CASTERS,
    },
  },
};

export const arcane = {
  ...playerCore('arcane', 'Arcane', 'Arcane magic comes from study of the universe’s logical patterns.'),
  kind: ContentKind.SpellcastingTradition,
  rules: [],
  data: { skill: 'skill:arcana' },
};

export const heroism = {
  ...playerCore('spell-effect-heroism', 'Spell Effect: Heroism', 'Granted by the Heroism spell.'),
  kind: ContentKind.Effect,
  level: HEROISM_LEVEL,
  rules: [
    {
      key: 'FlatModifier',
      selectors: ['attack-roll', 'saving-throw', 'skill-check', 'perception'],
      type: 'status',
      value: 'ternary(gte(@item.level, 9), 3, ternary(gte(@item.level, 6), 2, 1))',
    },
  ],
  data: {
    category: 'spell',
    duration: { type: 'time', count: HEROISM_MINUTES, unit: 'minute', expiry: 'turn-start' },
  },
};
