import { ContentKind, contentId, PackId, SenseAcuity, Slug } from '@pioneer/rules/sdk';

const PLAYER_CORE = PackId.parse('player-core');
const GM_CORE = PackId.parse('gm-core');

/** Examples cite page 1, like the other playground examples; the importer fills real pages. */
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };
const gmCorePage = { kind: 'book', book: 'gm-core', page: 1 };

const paragraph = (text: string): unknown => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const playerCoreId = (slug: string): string => contentId(PLAYER_CORE, Slug.parse(slug));

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

const offGuard = playerCoreId('off-guard');
const immobilized = playerCoreId('immobilized');

export const grabbed = {
  ...playerCore(
    'grabbed',
    'Grabbed',
    "You're held in place by another creature, giving you the off-guard and immobilized conditions.",
  ),
  kind: ContentKind.Condition,
  rules: [
    { key: 'GrantItem', item: offGuard },
    { key: 'GrantItem', item: immobilized },
  ],
  data: { valued: false, overrides: [], implies: [offGuard, immobilized] },
};

export const aid = {
  ...playerCore('aid', 'Aid', 'You try to help your ally with a task.'),
  kind: ContentKind.Action,
  rules: [],
  data: {
    cost: 'reaction',
    requirements: [paragraph('The ally is willing to accept your aid, and you have prepared to help.')],
    trigger: [paragraph('An ally is about to use an action that requires a skill check or attack roll.')],
  },
};

export const fire = {
  ...playerCore('fire', 'Fire', 'Fire damage burns through heat and combustion.'),
  kind: ContentKind.DamageType,
  traits: ['energy'],
  rules: [],
  data: {},
};

export const darkvision = {
  ...playerCore(
    'darkvision',
    'Darkvision',
    'You can see in darkness and dim light just as well as you can see in bright light, though your vision in darkness is in black and white.',
  ),
  kind: ContentKind.Sense,
  rules: [],
  data: { acuity: SenseAcuity.Precise, unlimitedRange: true },
};

export const draconic = {
  ...playerCore('draconic', 'Draconic', 'The language of dragons and dragonkin.'),
  kind: ContentKind.Language,
  rules: [],
  data: {},
};

export const manipulate = {
  ...playerCore(
    'manipulate',
    'Manipulate',
    'You must physically manipulate an item or make gestures to use an action with this trait.',
  ),
  kind: ContentKind.Trait,
  rules: [],
  data: { appliesTo: [ContentKind.Action, ContentKind.Feat] },
};

export const freeArchetype = {
  id: contentId(GM_CORE, Slug.parse('free-archetype')),
  pack: GM_CORE,
  kind: ContentKind.VariantRule,
  slug: 'free-archetype',
  name: 'Free Archetype',
  rarity: 'common',
  traits: [],
  sources: [gmCorePage],
  description: [
    paragraph('Each character gains an extra class feat at 2nd level and every even level, for archetype feats only.'),
  ],
  rules: [],
  data: {},
};
