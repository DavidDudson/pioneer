import {
  ActionCost,
  Attribute,
  contentId,
  ContentKind,
  DeityCategory,
  DivineFont,
  EntrySlug,
  FeatCategory,
  PackId,
} from '@pioneer/rules/sdk';

const PLAYER_CORE = PackId.parse('player-core');

/** Examples cite page 1, like the other playground examples; the importer fills real pages. */
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };

const paragraph = (text: string): unknown => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const playerCoreId = (slug: string): string => contentId(PLAYER_CORE, EntrySlug.parse(slug));

/** The envelope fields every Player Core example shares. */
function playerCore(slug: string, name: string, description: string): object {
  return {
    id: playerCoreId(slug),
    pack: PLAYER_CORE,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [playerCorePage],
    description: [paragraph(description)],
  };
}

/* Player Core numbers (Foundry pf2e): the fighter's hit points and extra skills, feat levels, Pharasma's spells. */
const FIGHTER_HIT_POINTS = 10;
const FIGHTER_ADDITIONAL_SKILLS = 3;
const FIRST_LEVEL = 1;
const SECOND_LEVEL = 2;
const BRAVERY_LEVEL = 3;
const FIRST_RANK = 1;
const THIRD_RANK = 3;
const FOURTH_RANK = 4;

/** Any attribute: a free boost. */
const FREE_BOOST = Object.values(Attribute);

export const skilledHuman = {
  ...playerCore(
    'heritage:skilled-human',
    'Skilled Human',
    'Your ingenuity allows you to train in a wide variety of skills.',
  ),
  kind: ContentKind.Heritage,
  rules: [],
  data: { ancestry: playerCoreId('ancestry:human') },
};

export const farmhand = {
  ...playerCore(
    'background:farmhand',
    'Farmhand',
    'With a strong back and an understanding of seasonal cycles, you tilled the land.',
  ),
  kind: ContentKind.Background,
  rules: [
    { key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' },
    { key: 'Proficiency', selector: 'skill:lore:farming', rank: 'trained' },
    // Foundry preselects Athletics for Assurance's skill choice; GrantItem has no way to say so yet.
    { key: 'GrantItem', item: playerCoreId('feat:assurance') },
  ],
  data: { boosts: [[Attribute.Constitution, Attribute.Wisdom], FREE_BOOST] },
};

/** A class feat slot that opens at `level`, offering fighter feats up to the character's level. */
function fighterFeat(level: number): object {
  return {
    key: 'ChoiceSet',
    flag: `class-feat-${level}`,
    choices: { kind: ContentKind.Feat, filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
    predicate: [{ gte: ['self:level', level] }],
  };
}

export const fighter = {
  ...playerCore('class:fighter', 'Fighter', 'Fighting for honor, greed, loyalty, or simply the thrill of battle.'),
  kind: ContentKind.Class,
  rules: [
    { key: 'Proficiency', selector: 'perception', rank: 'expert' },
    { key: 'Proficiency', selector: 'save:fortitude', rank: 'expert' },
    { key: 'Proficiency', selector: 'save:reflex', rank: 'expert' },
    { key: 'Proficiency', selector: 'save:will', rank: 'trained' },
    { key: 'Proficiency', selector: 'attack:simple', rank: 'expert' },
    { key: 'Proficiency', selector: 'attack:martial', rank: 'expert' },
    { key: 'Proficiency', selector: 'attack:unarmed', rank: 'expert' },
    { key: 'Proficiency', selector: 'attack:advanced', rank: 'trained' },
    { key: 'Proficiency', selector: 'defense:unarmored', rank: 'trained' },
    { key: 'Proficiency', selector: 'defense:light', rank: 'trained' },
    { key: 'Proficiency', selector: 'defense:medium', rank: 'trained' },
    { key: 'Proficiency', selector: 'defense:heavy', rank: 'trained' },
    { key: 'Proficiency', selector: 'class-dc', rank: 'trained' },
    // Acrobatics or Athletics is the player's pick, beside the three additional skills.
    { key: 'GrantItem', item: playerCoreId('class-feature:reactive-strike') },
    fighterFeat(FIRST_LEVEL),
    fighterFeat(SECOND_LEVEL),
    {
      key: 'GrantItem',
      item: playerCoreId('class-feature:bravery'),
      predicate: [{ gte: ['self:level', BRAVERY_LEVEL] }],
    },
  ],
  data: {
    keyAttribute: [Attribute.Strength, Attribute.Dexterity],
    hitPoints: FIGHTER_HIT_POINTS,
    additionalSkills: FIGHTER_ADDITIONAL_SKILLS,
  },
};

export const reactiveStrike = {
  ...playerCore('class-feature:reactive-strike', 'Reactive Strike', 'You lash out at a foe that leaves an opening.'),
  kind: ContentKind.ClassFeature,
  level: FIRST_LEVEL,
  traits: ['fighter'],
  // The feature is passive: it grants the Reactive Strike action, as Foundry pf2e does.
  rules: [{ key: 'GrantItem', item: playerCoreId('action:reactive-strike') }],
  data: {},
};

export const keenEyes = {
  ...playerCore('ancestry-feature:keen-eyes', 'Keen Eyes', 'Your eyes are sharp.'),
  kind: ContentKind.AncestryFeature,
  traits: ['halfling'],
  // The halfling ancestry grants it; it is never picked.
  rules: [
    {
      key: 'FlatModifier',
      selector: 'perception',
      type: 'circumstance',
      value: 2,
      predicate: ['action:seek', { or: ['target:condition:hidden', 'target:condition:undetected'] }],
    },
  ],
  data: {},
};

export const suddenCharge = {
  ...playerCore('feat:sudden-charge', 'Sudden Charge', 'With a quick sprint, you dash up to your foe and swing.'),
  kind: ContentKind.Feat,
  level: FIRST_LEVEL,
  traits: ['fighter', 'flourish', 'open'],
  rules: [],
  data: { category: FeatCategory.Class, action: { cost: ActionCost.Two } },
};

export const fighterArchetype = {
  ...playerCore(
    'archetype:fighter-archetype',
    'Fighter',
    'You have trained carefully to improve your skill with weapons.',
  ),
  kind: ContentKind.Archetype,
  rules: [],
  data: { dedication: playerCoreId('feat:fighter-dedication'), multiclass: playerCoreId('class:fighter') },
};

export const pharasma = {
  ...playerCore('deity:pharasma', 'Pharasma', 'The Lady of Graves judges every soul that passes through the Boneyard.'),
  kind: ContentKind.Deity,
  rules: [],
  data: {
    category: DeityCategory.Deity,
    domains: { primary: ['death', 'fate', 'healing', 'knowledge'], alternate: ['soul', 'time', 'vigil'] },
    font: [DivineFont.Heal],
    attributes: [Attribute.Constitution, Attribute.Wisdom],
    skills: ['skill:medicine'],
    weapons: ['dagger'],
    spells: [
      { rank: FIRST_RANK, spell: playerCoreId('spell:mindlink') },
      { rank: THIRD_RANK, spell: playerCoreId('spell:ghostly-weapon') },
      { rank: FOURTH_RANK, spell: playerCoreId('spell:vision-of-death') },
    ],
  },
};
